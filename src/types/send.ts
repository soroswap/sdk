// ============================================
// Request Types
// ============================================

export interface SendRequest {
  xdr: string;
  launchtube?: boolean;
}

// ============================================
// Discriminated Union for Transaction Results
// ============================================

/** Result for swap transactions (Router/Aggregator/SDEX) */
export interface SwapResult {
  type: 'swap';
  /** Amount sent by the user (in stroops/smallest unit) */
  amountIn: string;
  /** Final amount received by the user (in stroops/smallest unit) */
  amountOut: string;
  /** Intermediate amounts for multi-hop swaps */
  intermediateAmounts?: string[];
}

/** Result for transactions we don't have specific parsing for yet */
export interface UnknownResult {
  type: 'unknown';
  /** The parsed native value from scValToNative() - structure varies by transaction type */
  value: unknown;
}

/** Result for add liquidity transactions */
export interface AddLiquidityResult {
  type: 'add_liquidity';
  /** Amount of token A deposited (in stroops/smallest unit) */
  amountA: string;
  /** Amount of token B deposited (in stroops/smallest unit) */
  amountB: string;
  /** LP tokens/shares received */
  shares: string;
}

/** Result for remove liquidity transactions */
export interface RemoveLiquidityResult {
  type: 'remove_liquidity';
  /** Amount of token A received (in stroops/smallest unit) */
  amountA: string;
  /** Amount of token B received (in stroops/smallest unit) */
  amountB: string;
}

/** Union of all possible transaction result types */
export type TransactionResult =
  | SwapResult
  | AddLiquidityResult
  | RemoveLiquidityResult
  | UnknownResult;

// ============================================
// Main Response Type
// ============================================

export interface SendTransactionResponse {
  /** Transaction hash (normalized from all sources) */
  txHash: string;

  /** Whether the transaction succeeded */
  success: boolean;

  /** Parsed result - discriminated union based on transaction type */
  result: TransactionResult | null;

  /** Ledger the transaction was included in */
  ledger: number;

  /** When the transaction was created (ISO 8601 string) */
  createdAt: string;

  /** Latest ledger at response time */
  latestLedger: number;

  /** Latest ledger close time */
  latestLedgerCloseTime: string;

  /** Whether this was a fee bump transaction */
  feeBump: boolean;

  /** Fee charged in stroops */
  feeCharged: string;

  /** Which protocol/contract executed the transaction */
  protocol: 'router' | 'aggregator' | 'sdex' | 'unknown';

  /** Transaction submission method */
  submissionMethod: 'soroban' | 'horizon' | 'launchtube';
}
