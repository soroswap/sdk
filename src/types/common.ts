// Trade types
export enum TradeType {
  EXACT_IN = 'EXACT_IN',
  EXACT_OUT = 'EXACT_OUT',
}

// Asset list types
export enum SupportedAssetLists {
  SOROSWAP = 'https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json',
  STELLAR_EXPERT = 'https://api.stellar.expert/explorer/public/asset-list/top50',
  LOBSTR = 'https://lobstr.co/api/v1/sep/assets/curated.json',
  AQUA = 'https://amm-api.aqua.network/tokens/?format=json&pooled=true&size=200',
}

export enum SupportedPlatforms {
  SDEX = 'sdex',
  AGGREGATOR = 'aggregator',
  ROUTER = 'router'
}

export enum SupportedNetworks {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
}

export enum SupportedProtocols {
  SOROSWAP = 'soroswap',
  PHOENIX = 'phoenix',
  AQUA = 'aqua',
  COMET = 'comet',
  SUSHI = 'sushi',
  SDEX = 'sdex',
}

export interface SoroswapSDKConfig {
  apiKey: string;
  baseUrl?: string;
  defaultNetwork?: SupportedNetworks;
  timeout?: number;
}