import { SupportedAssetLists, SupportedPlatforms, SupportedProtocols, TradeType } from "./common";

export enum GaslessTrustlineType {
  CREATE = 'create',
  // REMOVE = 'remove',
}
// Quote types
export interface QuoteRequest {
  assetIn: string;
  assetOut: string;
  amount: bigint;
  tradeType: TradeType;
  protocols: SupportedProtocols[];
  parts?: number;
  slippageBps?: number;
  maxHops?: number;
  assetList?: (SupportedAssetLists | string)[];
  feeBps?: number;
  gaslessTrustline?: GaslessTrustlineType;
}

export interface BuildQuoteRequest {
  quote: QuoteResponse;
  from?: string;
  to?: string;
  referralId?: string;
  sponsor?: string;
  signedUserXdr?: string;
}

export interface BuildQuoteResponse {
  xdr: string;
  action: string;
  description: string;
}
export interface DistributionReturn {
  protocol_id: SupportedProtocols
  path: string[]
  parts: number
  is_exact_in: boolean
  poolHashes?: string[]
  poolIds?: string[]
}

export interface BaseExactInTrade {
  amountIn: bigint
  amountOutMin: bigint
}

export interface ExactInTradeWithPath extends BaseExactInTrade {
  path: string[]
  distribution?: never
}

export interface ExactInTradeWithDistribution extends BaseExactInTrade {
  path?: never
  distribution: DistributionReturn[]
}

export type ExactInTrade = ExactInTradeWithPath | ExactInTradeWithDistribution

export interface BaseExactOutTrade {
  amountOut: bigint
  amountInMax: bigint
}

export interface ExactOutTradeWithPath extends BaseExactOutTrade {
  path: string[]
  distribution?: never
}

export interface ExactOutTradeWithDistribution extends BaseExactOutTrade {
  path?: never
  distribution: DistributionReturn[]
}

export type ExactOutTrade = ExactOutTradeWithPath | ExactOutTradeWithDistribution

export interface HorizonPath {
  asset_type: string
  asset_code: string
  asset_issuer: string
}

export interface HorizonBaseStrictPaths {
  source_asset_type: string
  source_amount: string
  max_source_amount?: string
  source_asset_code?: string
  source_asset_issuer?: string
  destination_asset_type: string
  destination_amount: string
  min_destination_amount?: string
  destination_asset_code?: string
  destination_asset_issuer?: string
  path: HorizonPath[]
}

export interface HorizonTrustlineStrictPaths extends HorizonBaseStrictPaths {
  trustlineOperation: HorizonBaseStrictPaths
  netAmount: string
  otherNetAmountThreshold: string
}

export type HorizonStrictPaths = HorizonBaseStrictPaths | HorizonTrustlineStrictPaths

export interface RoutePlan {
  swapInfo: {
    protocol: SupportedProtocols,
    path: string[],
  }
  percent: string
}

export interface PlatformFee {
  feeBps: number
  feeAmount: bigint
}

export interface TrustlineInfo {
  trustlineCostAssetIn: string
  trustlineCostAssetOut: string
}

interface BaseQuoteResponse {
  assetIn: string
  amountIn: bigint
  assetOut: string
  amountOut: bigint
  otherAmountThreshold: bigint
  priceImpactPct: string
  platform: SupportedPlatforms
  routePlan: RoutePlan[]
  trustlineInfo?: TrustlineInfo
  platformFee?: PlatformFee
  gaslessTrustline?: GaslessTrustlineType
}

export interface ExactInQuoteResponse extends BaseQuoteResponse {
  tradeType: TradeType.EXACT_IN
  rawTrade: ExactInTrade | HorizonStrictPaths
}

export interface ExactOutQuoteResponse extends BaseQuoteResponse {
  tradeType: TradeType.EXACT_OUT
  rawTrade: ExactOutTrade | HorizonStrictPaths
}

export type QuoteResponse = ExactInQuoteResponse | ExactOutQuoteResponse