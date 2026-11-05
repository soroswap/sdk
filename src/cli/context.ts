import { SoroswapSDK } from '../soroswap-sdk';
import { SoroswapSDKConfig, SupportedNetworks } from '../types';
import { parseRawAmount, parseUnits } from './amounts';
import { AssetResolver, FetchJson } from './assets';
import { CliError, UsageError } from './errors';
import { OutputFormat } from './output';
import { Env, resolveSigner, Signer } from './signer';
import { StellarClient } from './stellar';

export const DEFAULT_BASE_URL = 'https://api.soroswap.finance';

/** Everything a command touches outside its own arguments. Tests replace these. */
export interface CliDeps {
  env: Env;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  createSdk: (config: SoroswapSDKConfig) => SoroswapSDK;
  fetchJson: FetchJson;
  readStdin: () => Promise<string>;
  stellar: StellarClient;
}

export type Values = Record<string, string | boolean | string[] | undefined>;

export class CliContext {
  readonly baseUrl: string;
  readonly assets: AssetResolver;
  private sdkInstance?: SoroswapSDK;

  constructor(
    readonly deps: CliDeps,
    readonly network: SupportedNetworks,
    readonly format: OutputFormat,
  ) {
    this.baseUrl = deps.env.SOROSWAP_API_URL || DEFAULT_BASE_URL;
    this.assets = new AssetResolver(network, this.baseUrl, deps.fetchJson, deps.stellar);
  }

  /** SDK client. Built on first use so commands that need no key never ask for one. */
  sdk(): SoroswapSDK {
    if (!this.sdkInstance) {
      const apiKey = this.deps.env.SOROSWAP_API_KEY;
      if (!apiKey) {
        throw new CliError('SOROSWAP_API_KEY is not set. Register at https://api.soroswap.finance/register to get one');
      }
      this.sdkInstance = this.deps.createSdk({ apiKey, baseUrl: this.baseUrl, defaultNetwork: this.network });
    }
    return this.sdkInstance;
  }

  signer(): Signer {
    return resolveSigner(this.deps.env);
  }
}

/** `--amount` (human units) or `--raw-amount` (smallest unit); exactly one is required. */
export function readAmount(values: Values, decimals: number | null): bigint {
  const human = values.amount as string | undefined;
  const raw = values['raw-amount'] as string | undefined;
  if (human !== undefined && raw !== undefined) {
    throw new UsageError('--amount and --raw-amount are mutually exclusive');
  }
  if (raw !== undefined) return parseRawAmount(raw);
  if (human === undefined) throw new UsageError('One of --amount or --raw-amount is required');
  if (decimals === null) throw new CliError('Could not resolve the asset decimals; pass --raw-amount instead');
  return parseUnits(human, decimals);
}

/** Validate --amount/--raw-amount before any network call. */
export function checkAmountFlags(values: Values): void {
  if (values.amount !== undefined && values['raw-amount'] !== undefined) {
    throw new UsageError('--amount and --raw-amount are mutually exclusive');
  }
  if (values.amount === undefined && values['raw-amount'] === undefined) {
    throw new UsageError('One of --amount or --raw-amount is required');
  }
}

export function requireString(values: Values, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || value.trim() === '') throw new UsageError(`--${name} is required`);
  return value;
}

export function optionalInt(values: Values, name: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
  const value = values[name];
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new UsageError(`--${name} must be an integer between ${min} and ${max}`);
  }
  return n;
}

export function list(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}
