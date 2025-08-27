import { HttpClient } from './clients/http-client';
import {
  AddLiquidityRequest,
  AssetList,
  AssetListInfo,
  BuildQuoteRequest,
  BuildQuoteResponse,
  LiquidityResponse,
  Pool,
  PriceData,
  QuoteRequest,
  QuoteResponse,
  RemoveLiquidityRequest,
  SoroswapSDKConfig,
  SupportedAssetLists,
  SupportedNetworks,
  UserPositionResponse
} from './types';
import { SendRequest } from './types/send';

/**
 * Main Soroswap SDK class
 * Provides access to all Soroswap API functionality with API key authentication
 */
export class SoroswapSDK {
  private httpClient: HttpClient;
  private defaultNetwork: SupportedNetworks;

  constructor(config: SoroswapSDKConfig) {
    this.defaultNetwork = config.defaultNetwork || SupportedNetworks.MAINNET;
    
    // Initialize HTTP client with API key
    const baseURL = config.baseUrl || 'https://api.soroswap.finance';
    const timeout = config.timeout || 30000;
    
    this.httpClient = new HttpClient(
      baseURL,
      config.apiKey,
      timeout
    );
  }

  /**
   * Transform asset list from enum URLs to simple strings for API
   */
  private transformAssetList(assetList: (SupportedAssetLists | string)[]): string[] {
    return assetList.map(asset => {
      if (typeof asset === 'string') {
        // If it's already a string, check if it's an enum URL
        if (Object.values(SupportedAssetLists).includes(asset as SupportedAssetLists)) {
          // Extract the identifier from the URL
          switch (asset) {
            case SupportedAssetLists.SOROSWAP:
              return 'soroswap';
            case SupportedAssetLists.STELLAR_EXPERT:
              return 'stellar_expert';
            case SupportedAssetLists.LOBSTR:
              return 'lobstr';
            case SupportedAssetLists.AQUA:
              return 'aqua';
            default:
              return asset;
          }
        }
        return asset;
      }
      // If it's an enum, transform to simple string
      switch (asset) {
        case SupportedAssetLists.SOROSWAP:
          return 'soroswap';
        case SupportedAssetLists.STELLAR_EXPERT:
          return 'stellar_expert';
        case SupportedAssetLists.LOBSTR:
          return 'lobstr';
        case SupportedAssetLists.AQUA:
          return 'aqua';
        default:
          return asset as string;
      }
    });
  }

  /**
   * Get contract address for a specific network and contract name
   */
  async getContractAddress(
    network: SupportedNetworks,
    contractName: 'factory' | 'router' | 'aggregator'
  ): Promise<{address: string}> {
    return this.httpClient.get<{address: string}>(`/api/${network}/${contractName}`);
  }

  // ========================================
  // Quote & Trading Methods
  // ========================================

  /**
   * Get available protocols for trading
   */
  async getProtocols(network?: SupportedNetworks): Promise<string[]> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery('/protocols', params);
    return this.httpClient.get<string[]>(url);
  }

  /**
   * Get quote for a swap
   */
  async quote(quoteRequest: QuoteRequest, network?: SupportedNetworks): Promise<QuoteResponse> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery('/quote', params);
    
    // Transform the request to convert enum URLs to simple strings
    const transformedRequest = { ...quoteRequest };
    if (transformedRequest.assetList) {
      transformedRequest.assetList = this.transformAssetList(transformedRequest.assetList);
    }
    
    return this.httpClient.post<QuoteResponse>(url, transformedRequest);
  }

  /**
   * This builds the quote into an XDR transaction
   */
  async build(buildQuoteRequest: BuildQuoteRequest, network?: SupportedNetworks): Promise<BuildQuoteResponse> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery('/quote/build', params);
    return this.httpClient.post<BuildQuoteResponse>(url, buildQuoteRequest);
  }

  /**
   * Send signed transaction
   */
  async send(xdr: string, launchtube: boolean = false, network?: SupportedNetworks): Promise<any> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery('/send', params);
    
    const sendData: SendRequest = { xdr, launchtube };
    return this.httpClient.post<any>(url, sendData);
  }

  // ========================================
  // Pool Methods
  // ========================================

  /**
   * Get pools for specific protocols
   */
  async getPools(
    network: SupportedNetworks,
    protocols: string[],
    assetList?: (SupportedAssetLists | string)[]
  ): Promise<Pool[]> {
    const params: any = {
      network,
      protocol: protocols
    };

    if (assetList) {
      params.assetList = this.transformAssetList(assetList);
    }

    const url = this.httpClient.buildUrlWithQuery('/pools', params);
    return this.httpClient.get<Pool[]>(url);
  }

  /**
   * Get pool for specific token pair
   */
  async getPoolByTokens(
    assetA: string,
    assetB: string,
    network: SupportedNetworks,
    protocols: string[]
  ): Promise<Pool[]> {
    const params = {
      network,
      protocol: protocols
    };

    const url = this.httpClient.buildUrlWithQuery(`/pools/${assetA}/${assetB}`, params);
    return this.httpClient.get<Pool[]>(url);
  }

  // ========================================
  // Liquidity Methods
  // ========================================

  /**
   * Add liquidity to a pool
   */
  async addLiquidity(
    liquidityData: AddLiquidityRequest,
    network?: SupportedNetworks
  ): Promise<LiquidityResponse> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery('/liquidity/add', params);
    return this.httpClient.post<LiquidityResponse>(url, liquidityData);
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(
    liquidityData: RemoveLiquidityRequest,
    network?: SupportedNetworks
  ): Promise<LiquidityResponse> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery('/liquidity/remove', params);
    return this.httpClient.post<LiquidityResponse>(url, liquidityData);
  }

  /**
   * Get user liquidity positions
   */
  async getUserPositions(
    address: string,
    network?: SupportedNetworks
  ): Promise<UserPositionResponse[]> {
    const params = { network: network || this.defaultNetwork };
    const url = this.httpClient.buildUrlWithQuery(`/liquidity/positions/${address}`, params);
    return this.httpClient.get<UserPositionResponse[]>(url);
  }

  // ========================================
  // Asset & Price Methods
  // ========================================

  /**
   * Get asset lists metadata or specific asset list
   */
  async getAssetList(name?: SupportedAssetLists): Promise<AssetList[] | AssetListInfo[]> {
    const params = name ? { name } : {};
    const url = this.httpClient.buildUrlWithQuery('/asset-list', params);
    
    if (name) {
      return this.httpClient.get<AssetList[]>(url);
    } else {
      return this.httpClient.get<AssetListInfo[]>(url);
    }
  }

  /**
   * Get asset prices
   */
  async getPrice(
    assets: string | string[],
    network?: SupportedNetworks,
  ): Promise<PriceData[]> {
    const params = {
      network: network || this.defaultNetwork,
      asset: Array.isArray(assets) ? assets : [assets],
    };

    const url = this.httpClient.buildUrlWithQuery('/price', params);
    return this.httpClient.get<PriceData[]>(url);
  }
} 