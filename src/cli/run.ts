import { parseArgs } from 'node:util';
import { SupportedNetworks } from '../types';
import { balancesCommand, poolsCommand, priceCommand } from './commands/market';
import { Command, OptionSpec } from './commands/command';
import { quoteCommand } from './commands/quote';
import { signCommand } from './commands/sign';
import { swapCommand } from './commands/swap';
import { CliContext, CliDeps, Values } from './context';
import { CliError, errorMessage, UsageError } from './errors';
import { OutputFormat, toJson } from './output';

export const COMMANDS: Command[] = [quoteCommand, swapCommand, priceCommand, balancesCommand, poolsCommand, signCommand];

/** Flags every command accepts. `--output` is an alias of `--format`. */
const GLOBAL_OPTIONS: Record<string, OptionSpec> = {
  format: { type: 'string', short: 'f' },
  output: { type: 'string' },
  network: { type: 'string', short: 'n' },
  help: { type: 'boolean', short: 'h' },
};

const GLOBAL_HELP = `Global options:
  -f, --format <table|json>        Output format (default table); --output is an alias
  -n, --network <mainnet|testnet>  Network (default mainnet)
  -h, --help                       Show help

Environment:
  SOROSWAP_API_KEY     API key (required by every command that calls the API)
  SOROSWAP_API_URL     API base URL (default https://api.soroswap.finance)
  STELLAR_SECRET_KEY   Secret key of the signer for swap and sign
  STELLAR_SIGNER       Signer backend (default secret-key)
  STELLAR_RPC_URL      Stellar RPC for decimals lookups and dry-run simulation`;

function version(): string {
  try {
    return require('../../package.json').version as string;
  } catch {
    return 'unknown';
  }
}

function mainHelp(): string {
  const width = Math.max(...COMMANDS.map(c => c.name.length));
  return `soroswap ${version()}: the Soroswap API from the command line

Usage: soroswap <command> [options]

Commands:
${COMMANDS.map(c => `  ${c.name.padEnd(width)}  ${c.summary}`).join('\n')}

${GLOBAL_HELP}

Run "soroswap <command> --help" for the options of a command.`;
}

/** Find the command name: the first token that is neither a flag nor a global flag's value. */
function splitCommand(argv: string[]): { name?: string; rest: string[] } {
  const takesValue = new Set(['-f', '--format', '--output', '-n', '--network']);
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (takesValue.has(token)) {
      i++;
      continue;
    }
    if (!token.startsWith('-')) return { name: token, rest: [...argv.slice(0, i), ...argv.slice(i + 1)] };
  }
  return { rest: argv };
}

/** Best-effort format detection, so even a usage error comes out as JSON when -f json was asked. */
function sniffFormat(argv: string[]): OutputFormat {
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (['-f', '--format', '--output'].includes(t) && argv[i + 1] === 'json') return 'json';
    if (/^(--format|--output)=json$/.test(t) || t === '-fjson') return 'json';
  }
  return 'table';
}

function readFormat(values: Values): OutputFormat {
  const format = (values.format ?? values.output ?? 'table') as string;
  if (format !== 'table' && format !== 'json') throw new UsageError(`--format must be "table" or "json", got "${format}"`);
  return format;
}

function readNetwork(values: Values): SupportedNetworks {
  const network = (values.network ?? 'mainnet') as string;
  if (network !== SupportedNetworks.MAINNET && network !== SupportedNetworks.TESTNET) {
    throw new UsageError(`--network must be "mainnet" or "testnet", got "${network}"`);
  }
  return network as SupportedNetworks;
}

/** Run the CLI. Never throws and never calls process.exit; returns the exit code. */
export async function run(argv: string[], deps: CliDeps): Promise<number> {
  let format = sniffFormat(argv);
  try {
    if (argv.includes('--version') || argv.includes('-v')) {
      deps.stdout(format === 'json' ? toJson({ version: version() }) : version());
      return 0;
    }
    const { name, rest } = splitCommand(argv);
    if (!name) {
      if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
        deps.stdout(mainHelp());
        return 0;
      }
      throw new UsageError('Missing command. Run "soroswap --help" for the list');
    }
    if (name === 'help') {
      const target = COMMANDS.find(c => c.name === rest[0]);
      deps.stdout(target ? `${target.help}\n\n${GLOBAL_HELP}` : mainHelp());
      return 0;
    }
    const command = COMMANDS.find(c => c.name === name);
    if (!command) throw new UsageError(`Unknown command "${name}". Commands: ${COMMANDS.map(c => c.name).join(', ')}`);

    let parsed;
    try {
      parsed = parseArgs({
        args: rest,
        options: { ...GLOBAL_OPTIONS, ...command.options },
        allowPositionals: true,
        strict: true,
      });
    } catch (err) {
      throw new UsageError(`${(err as Error).message}. Run "soroswap ${name} --help"`);
    }
    const values = parsed.values as Values;
    format = readFormat(values);
    if (values.help) {
      deps.stdout(`${command.help}\n\n${GLOBAL_HELP}`);
      return 0;
    }
    const [min, max] = command.positionals;
    if (parsed.positionals.length < min || parsed.positionals.length > max) {
      throw new UsageError(`Wrong number of arguments for "${name}". Run "soroswap ${name} --help"`);
    }

    const ctx = new CliContext(deps, readNetwork(values), format);
    const result = await command.run(ctx, values, parsed.positionals);
    deps.stdout(format === 'json' ? toJson(result.data) : result.human);
    return result.exitCode ?? 0;
  } catch (err) {
    const message = errorMessage(err);
    // In JSON mode the error goes to stdout so a caller that parses stdout always gets JSON.
    if (format === 'json') deps.stdout(toJson({ error: message }));
    else deps.stderr(`Error: ${message}`);
    return err instanceof CliError ? err.exitCode : 1;
  }
}
