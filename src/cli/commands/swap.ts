import { StrKey } from '@stellar/stellar-sdk';
import { CliContext, Values } from '../context';
import { CliError, UsageError } from '../errors';
import { keyValues } from '../output';
import { hasSigner, Signer } from '../signer';
import { networkPassphrase } from '../stellar';
import { Command } from './command';
import { QUOTE_FLAGS_HELP, QUOTE_OPTIONS, renderQuote, runQuote, summarizeQuote } from './quote';

function checkAddress(value: string, flag: string): string {
  if (!StrKey.isValidEd25519PublicKey(value) && !StrKey.isValidContract(value)) {
    throw new UsageError(`${flag} must be a Stellar address (G... or C...)`);
  }
  return value;
}

/**
 * Who the swap is built for. A real swap needs a signer; a dry run only needs
 * an address, taken from --address or from the configured signer.
 */
async function resolveAccount(ctx: CliContext, values: Values): Promise<{ address: string; signer: Signer | null }> {
  const dryRun = values['dry-run'] === true;
  const flag = values.address as string | undefined;
  if (dryRun) {
    if (flag) return { address: checkAddress(flag, '--address'), signer: null };
    if (!hasSigner(ctx.deps.env)) {
      throw new UsageError('--dry-run needs --address <G...> or a configured signer (STELLAR_SECRET_KEY)');
    }
    return { address: await ctx.signer().publicKey(), signer: null };
  }
  const signer = ctx.signer();
  const address = await signer.publicKey();
  if (flag && flag !== address) {
    throw new UsageError(`--address ${flag} does not match the signer's address ${address}`);
  }
  return { address, signer };
}

export const swapCommand: Command = {
  name: 'swap',
  summary: 'Quote, build, sign and submit a swap (or --dry-run for the unsigned XDR)',
  help: `Usage: soroswap swap --from <asset> --to <asset> (--amount <n> | --raw-amount <n>) [options]

Gets a quote, builds the transaction through the API (which simulates and
assembles it), then signs with the configured signer and submits it.
With --dry-run it stops after building, simulates the XDR on Stellar RPC and
prints the unsigned XDR; nothing is signed or sent. Sign it later with
\`soroswap sign --xdr <xdr> --submit\`.

${QUOTE_FLAGS_HELP}
  --dry-run               Build and simulate only; print the unsigned XDR
  --address <G...>        Account that swaps (dry run without a signer); must match the signer otherwise
  --recipient <address>   Account that receives the output (default: the swapping account)

Signer (env only): STELLAR_SECRET_KEY=S...   (STELLAR_SIGNER selects other backends)

Examples:
  soroswap swap --from XLM --to USDC --amount 10 --dry-run --address G... -f json
  soroswap swap --from XLM --to USDC --amount 10 --network testnet`,
  options: {
    ...QUOTE_OPTIONS,
    'dry-run': { type: 'boolean' },
    address: { type: 'string' },
    recipient: { type: 'string' },
  },
  positionals: [0, 0],
  async run(ctx, values) {
    const dryRun = values['dry-run'] === true;
    const recipient = values.recipient ? checkAddress(values.recipient as string, '--recipient') : undefined;
    const { address, signer } = await resolveAccount(ctx, values);

    const quoteRun = await runQuote(ctx, values);
    const quote = summarizeQuote(ctx.network, quoteRun);
    const built = await ctx
      .sdk()
      .build({ quote: quoteRun.quote, from: address, to: recipient ?? address }, ctx.network);

    if (dryRun || !signer) {
      const simulation = await ctx.deps.stellar.simulate(built.xdr, ctx.network);
      const data = { dryRun: true, network: ctx.network, address, xdr: built.xdr, simulation, quote };
      const human = [
        renderQuote(quote),
        '',
        keyValues({
          address,
          simulation: simulation === null ? 'n/a (classic transaction)' : simulation.ok ? 'ok' : `failed: ${simulation.error}`,
        }),
        '',
        'Unsigned XDR:',
        built.xdr,
      ].join('\n');
      // A failed simulation still prints the XDR, but exits non-zero so scripts stop here.
      return { data, human, exitCode: simulation && !simulation.ok ? 1 : 0 };
    }

    const signedXdr = await signer.signTransaction(built.xdr, networkPassphrase(ctx.network));
    const sent = await ctx.sdk().send(signedXdr, ctx.network);
    if (!sent.success) {
      throw new CliError(`Transaction ${sent.txHash} was submitted but did not succeed on ${ctx.network}`);
    }
    const data = {
      dryRun: false,
      network: ctx.network,
      address,
      txHash: sent.txHash,
      success: sent.success,
      ledger: sent.ledger ?? null,
      feeCharged: sent.feeCharged ?? null,
      result: sent.result ?? null,
      quote,
    };
    const human = [
      renderQuote(quote),
      '',
      keyValues({ address, txHash: sent.txHash, ledger: sent.ledger, feeCharged: sent.feeCharged }),
    ].join('\n');
    return { data, human };
  },
};
