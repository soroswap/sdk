export interface AssetInfo {
  code?: string;
  issuer?: string;
  contract?: string;
  name?: string;
  org?: string;
  domain?: string;
  icon?: string;
  decimals?: number;
}

export interface AssetList {
  name: string;
  provider?: string;
  description?: string;
  version?: string;
  feedback?: string;
  network?: string;
  assets: AssetInfo[];
}

export interface AssetListInfo {
  name: string;
  url: string;
}

export interface AssetNameSymbol {
  address: string;
  name: string;
  symbol: string;
}