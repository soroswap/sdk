import { StrKey } from '@stellar/stellar-sdk';
import { SupportedAssetLists, SupportedNetworks } from '../types';
import { CliError, UsageError } from './errors';
import { classicAssetContract, StellarClient } from './stellar';

export interface ResolvedAsset {
  /** Soroban contract id (C...). */
  contract: string;
  /** Asset code when known (from the token list or CODE:ISSUER input), else null. */
  code: string | null;
  /** Token decimals, or null when not needed and not cheaply known. */
  decimals: number | null;
}

interface TokenListEntry {
  code?: string;
  contract?: string;
  issuer?: string;
  decimals?: number;
}

export type FetchJson = (url: string) => Promise<unknown>;

/**
 * Public token lists the CLI reads to turn symbols into contracts and to know
 * decimals. Neither needs an API key: mainnet is the soroswap/token-list repo,
 * testnet is the API's public `GET /api/tokens`.
 */
export async function loadTokenList(
  network: SupportedNetworks,
  baseUrl: string,
  fetchJson: FetchJson,
): Promise<TokenListEntry[]> {
  if (network === SupportedNetworks.MAINNET) {
    const list = (await fetchJson(SupportedAssetLists.SOROSWAP)) as { assets?: TokenListEntry[] };
    return list.assets ?? [];
  }
  const lists = (await fetchJson(`${baseUrl}/api/tokens`)) as { network: string; assets: TokenListEntry[] }[];
  return lists.find(l => l.network === network)?.assets ?? [];
}

export class AssetResolver {
  private list?: Promise<TokenListEntry[]>;

  constructor(
    private readonly network: SupportedNetworks,
    private readonly baseUrl: string,
    private readonly fetchJson: FetchJson,
    private readonly stellar: StellarClient,
  ) {}

  private tokens(): Promise<TokenListEntry[]> {
    // A missing token list only costs symbol lookups, so a failure falls back to an empty list.
    this.list ??= loadTokenList(this.network, this.baseUrl, this.fetchJson).catch(() => []);
    return this.list;
  }

  /**
   * Accepts a contract id (C...), "XLM"/"native", CODE:ISSUER, or a symbol from
   * the token list ("USDC"). With `needDecimals`, falls back to an on-chain
   * `decimals()` read for contracts that are not in the list.
   */
  async resolve(input: string, needDecimals = false): Promise<ResolvedAsset> {
    const value = input.trim();
    const tokens = await this.tokens();

    if (/^(xlm|native)$/i.test(value)) {
      return { contract: classicAssetContract('XLM', null, this.network), code: 'XLM', decimals: 7 };
    }

    if (value.includes(':')) {
      const [code, issuer] = value.split(':');
      if (!code || !StrKey.isValidEd25519PublicKey(issuer ?? '')) {
        throw new UsageError(`Invalid asset "${input}": expected CODE:ISSUER with a G... issuer`);
      }
      // Stellar Asset Contracts always have 7 decimals.
      return { contract: classicAssetContract(code, issuer, this.network), code, decimals: 7 };
    }

    if (StrKey.isValidContract(value)) {
      const known = tokens.find(t => t.contract === value);
      let decimals = known?.decimals ?? null;
      if (decimals === null && needDecimals) decimals = await this.stellar.fetchDecimals(value, this.network);
      return { contract: value, code: known?.code ?? null, decimals };
    }

    const matches = tokens.filter(t => t.code?.toLowerCase() === value.toLowerCase() && t.contract);
    if (matches.length === 1) {
      return { contract: matches[0].contract!, code: matches[0].code!, decimals: matches[0].decimals ?? 7 };
    }
    if (matches.length > 1) {
      throw new UsageError(
        `Symbol "${input}" is ambiguous on ${this.network}; use the contract id: ${matches.map(m => m.contract).join(', ')}`,
      );
    }
    throw new CliError(
      `Unknown asset "${input}" on ${this.network}: use a contract id (C...), CODE:ISSUER, XLM, or a symbol from the Soroswap token list`,
      2,
    );
  }
}
