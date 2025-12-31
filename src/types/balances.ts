/**
 * Asset information in balance responses
 */
export interface BalanceAssetInfo {
  /** Token code/symbol (e.g., 'XLM', 'USDC') */
  code: string;
  /** Asset issuer (null for native XLM and pure Soroban tokens) */
  issuer: string | null;
  /** Soroban contract address (C-prefixed) */
  contract: string;
  /** Human-readable asset name */
  name: string | null;
  /** Asset icon URL */
  icon: string | null;
  /** Token decimals */
  decimals: number;
}

/**
 * Individual token balance
 */
export interface TokenBalance {
  /** Asset information */
  asset: BalanceAssetInfo;
  /** Human-readable balance with decimals (e.g., '100.0000000') */
  amount: string;
  /** Raw balance in smallest unit (stroops for XLM) */
  rawAmount: string;
  /** Available/spendable amount (for XLM: balance minus reserves) */
  available: string;
  /** Raw available/spendable amount in smallest unit */
  availableRaw: string;
}

/**
 * Response for fetching all token balances for a wallet
 */
export interface BalancesResponse {
  /** Wallet address */
  wallet: string;
  /** Network (mainnet/testnet) */
  network: string;
  /** Array of token balances */
  balances: TokenBalance[];
  /** Timestamp when balances were fetched (ms since epoch) */
  updatedAt: number;
}

/**
 * Response for fetching a single token balance
 */
export interface SingleBalanceResponse {
  /** Wallet address */
  wallet: string;
  /** Network (mainnet/testnet) */
  network: string;
  /** Token balance information */
  balance: TokenBalance;
  /** Timestamp when balance was fetched (ms since epoch) */
  updatedAt: number;
}
