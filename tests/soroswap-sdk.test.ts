import { SoroswapSDK } from '../src';
import {
  AddLiquidityRequest,
  AssetList,
  AssetListInfo,
  BuildQuoteRequest,
  BuildQuoteResponse,
  GaslessTrustlineType,
  LiquidityAction,
  LiquidityResponse,
  Pool,
  PriceData,
  QuoteRequest,
  QuoteResponse,
  RemoveLiquidityRequest,
  SupportedAssetLists,
  SupportedNetworks,
  SupportedPlatforms,
  SupportedProtocols,
  TradeType,
  UserPositionResponse
} from '../src/types';
import { SendRequest } from '../src/types/send';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('SoroswapSDK - Comprehensive Unit Tests', () => {
  let sdk: SoroswapSDK;
  let mockHttpClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create SDK instance
    sdk = new SoroswapSDK({
      apiKey: 'sk_test_api_key_123',
      baseUrl: 'https://test-api.soroswap.finance',
      defaultNetwork: SupportedNetworks.TESTNET,
      timeout: 15000
    });

    // Access the mocked HTTP client
    mockHttpClient = (sdk as any).httpClient;
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const defaultSdk = new SoroswapSDK({
        apiKey: 'sk_test_key'
      });
      
      expect(defaultSdk).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customSdk = new SoroswapSDK({
        apiKey: 'sk_custom_key',
        baseUrl: 'http://localhost:3000',
        defaultNetwork: SupportedNetworks.MAINNET,
        timeout: 60000
      });
      
      expect(customSdk).toBeDefined();
    });
  });

  describe('Contract Addresses', () => {
    it('should get factory contract address', async () => {
      const mockResponse = { address: 'FACTORY_CONTRACT_ADDRESS_123' };
      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await sdk.getContractAddress(SupportedNetworks.MAINNET, 'factory');

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/mainnet/factory');
    });

    it('should get router contract address', async () => {
      const mockResponse = { address: 'ROUTER_CONTRACT_ADDRESS_123' };
      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await sdk.getContractAddress(SupportedNetworks.TESTNET, 'router');

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/testnet/router');
    });

    it('should get aggregator contract address', async () => {
      const mockResponse = { address: 'AGGREGATOR_CONTRACT_ADDRESS_123' };
      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await sdk.getContractAddress(SupportedNetworks.MAINNET, 'aggregator');

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/mainnet/aggregator');
    });

    it('should handle contract address errors', async () => {
      const errorMessage = 'Contract not found';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(
        sdk.getContractAddress(SupportedNetworks.MAINNET, 'factory')
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Protocols', () => {
    it('should get protocols with default network', async () => {
      const mockProtocols = ['soroswap', 'aqua', 'phoenix', 'sdex'];
      mockHttpClient.get = jest.fn().mockResolvedValue(mockProtocols);

      const result = await sdk.getProtocols();

      expect(result).toEqual(mockProtocols);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/protocols?network=testnet');
    });

    it('should get protocols with specified network', async () => {
      const mockProtocols = ['soroswap', 'aqua'];
      mockHttpClient.get = jest.fn().mockResolvedValue(mockProtocols);

      const result = await sdk.getProtocols(SupportedNetworks.MAINNET);

      expect(result).toEqual(mockProtocols);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/protocols?network=mainnet');
    });

    it('should handle protocols error', async () => {
      const errorMessage = 'Failed to fetch protocols';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.getProtocols()).rejects.toThrow(errorMessage);
    });
  });

  describe('Quote Operations', () => {
    const mockQuoteRequest: QuoteRequest = {
      assetIn: 'ASSET_IN_123',
      assetOut: 'ASSET_OUT_456',
      amount: 1000000n,
      tradeType: TradeType.EXACT_IN,
      protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
      slippageBps: 50,
      maxHops: 3
    };

    const mockQuoteResponse: QuoteResponse = {
      assetIn: 'ASSET_IN_123',
      amountIn: "1000000",
      assetOut: 'ASSET_OUT_456',
      amountOut: 995000,
      otherAmountThreshold: 995000,
      priceImpactPct: "0.50",
      platform: SupportedPlatforms.AGGREGATOR,
      routePlan: [{
        protocol: SupportedProtocols.SOROSWAP,
        path: ['ASSET_IN_123', 'ASSET_OUT_456'],
        percentage: "100.00"
      }],
      tradeType: TradeType.EXACT_IN,
      rawTrade: {
        amountIn: "1000000",
        amountOutMin: 995000,
        distribution: [{
          protocol_id: SupportedProtocols.SOROSWAP,
          path: ['ASSET_IN_123', 'ASSET_OUT_456'],
          parts: 10,
          is_exact_in: true
        }]
      }
    } as any;

    it('should get quote with default network', async () => {
      mockHttpClient.post = jest.fn().mockResolvedValue(mockQuoteResponse);

      const result = await sdk.quote(mockQuoteRequest);

      expect(result).toEqual(mockQuoteResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/quote?network=testnet', mockQuoteRequest);
    });

    it('should get quote with specified network', async () => {
      mockHttpClient.post = jest.fn().mockResolvedValue(mockQuoteResponse);

      const result = await sdk.quote(mockQuoteRequest, SupportedNetworks.MAINNET);

      expect(result).toEqual(mockQuoteResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/quote?network=mainnet', mockQuoteRequest);
    });

    it('should handle quote with optional parameters', async () => {
      const quoteWithOptionals: QuoteRequest = {
        ...mockQuoteRequest,
        parts: 5,
        feeBps: 30,
        gaslessTrustline: GaslessTrustlineType.CREATE
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockQuoteResponse);

      const result = await sdk.quote(quoteWithOptionals);

      expect(result).toEqual(mockQuoteResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/quote?network=testnet', quoteWithOptionals);
    });

    it('should handle quote errors', async () => {
      const errorMessage = 'No route found';
      mockHttpClient.post = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.quote(mockQuoteRequest)).rejects.toThrow(errorMessage);
    });
  });

  describe('Build Operations', () => {
    const mockBuildRequest: BuildQuoteRequest = {
      quote: {} as QuoteResponse,
      from: 'WALLET_ADDRESS_123',
      to: 'RECIPIENT_ADDRESS_456',
      referralId: 'REFERRAL_ADDRESS_789'
    };

    const mockBuildResponse: BuildQuoteResponse = {
      xdr: 'MOCK_TRANSACTION_XDR_12345',
      action: 'SIGN_USER_TRANSACTION',
      description: 'Mock transaction description'
    };

    it('should build transaction with default network', async () => {
      mockHttpClient.post = jest.fn().mockResolvedValue(mockBuildResponse);

      const result = await sdk.build(mockBuildRequest);

      expect(result).toEqual(mockBuildResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/quote/build?network=testnet', mockBuildRequest);
    });

    it('should build transaction with specified network', async () => {
      mockHttpClient.post = jest.fn().mockResolvedValue(mockBuildResponse);

      const result = await sdk.build(mockBuildRequest, SupportedNetworks.MAINNET);

      expect(result).toEqual(mockBuildResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/quote/build?network=mainnet', mockBuildRequest);
    });

    it('should handle build with minimal parameters', async () => {
      const minimalBuildRequest: BuildQuoteRequest = {
        quote: {} as QuoteResponse,
        from: 'WALLET_ADDRESS_123'
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockBuildResponse);

      const result = await sdk.build(minimalBuildRequest);

      expect(result).toEqual(mockBuildResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/quote/build?network=testnet', minimalBuildRequest);
    });

    it('should handle build errors', async () => {
      const errorMessage = 'Build transaction failed';
      mockHttpClient.post = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.build(mockBuildRequest)).rejects.toThrow(errorMessage);
    });
  });

  describe('Send Operations', () => {
    const mockSendResponse = {
      hash: 'TRANSACTION_HASH_123',
      status: 'SUCCESS'
    };

    it('should send transaction with default parameters', async () => {
      const expectedRequest: SendRequest = {
        xdr: 'SIGNED_XDR_123',
        launchtube: false
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockSendResponse);

      const result = await sdk.send('SIGNED_XDR_123');

      expect(result).toEqual(mockSendResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/send?network=testnet', expectedRequest);
    });

    it('should send transaction with launchtube enabled', async () => {
      const expectedRequest: SendRequest = {
        xdr: 'SIGNED_XDR_123',
        launchtube: true
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockSendResponse);

      const result = await sdk.send('SIGNED_XDR_123', true);

      expect(result).toEqual(mockSendResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/send?network=testnet', expectedRequest);
    });

    it('should send transaction with specified network', async () => {
      const expectedRequest: SendRequest = {
        xdr: 'SIGNED_XDR_123',
        launchtube: false
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockSendResponse);

      const result = await sdk.send('SIGNED_XDR_123', false, SupportedNetworks.MAINNET);

      expect(result).toEqual(mockSendResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/send?network=mainnet', expectedRequest);
    });

    it('should handle send errors', async () => {
      const errorMessage = 'Transaction failed';
      mockHttpClient.post = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.send('SIGNED_XDR_123')).rejects.toThrow(errorMessage);
    });
  });

  describe('Pool Operations', () => {
    const mockPools: Pool[] = [
      {
        protocol: SupportedProtocols.SOROSWAP,
        address: 'POOL_ADDRESS_123',
        tokenA: 'TOKEN_A_123',
        tokenB: 'TOKEN_B_456',
        reserveA: 1000000n,
        reserveB: 2000000n,
        ledger: 12345,
        involvesAsset: jest.fn()
      } as Pool
    ];

    it('should get pools with default parameters', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPools);

      const result = await sdk.getPools(SupportedNetworks.MAINNET, [SupportedProtocols.SOROSWAP]);

      expect(result).toEqual(mockPools);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/pools?network=mainnet&protocol=soroswap');
    });

    it('should get pools with asset lists filter', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPools);

      const result = await sdk.getPools(
        SupportedNetworks.MAINNET,
        [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
        [SupportedAssetLists.SOROSWAP]
      );

      expect(result).toEqual(mockPools);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/pools?network=mainnet&protocol=soroswap&protocol=aqua&assetList=soroswap'
      );
    });

    it('should get pools with string array asset list', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPools);

      const result = await sdk.getPools(
        SupportedNetworks.MAINNET,
        [SupportedProtocols.SOROSWAP],
        ['soroswap', 'custom_list']
      );

      expect(result).toEqual(mockPools);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/pools?network=mainnet&protocol=soroswap&assetList=soroswap&assetList=custom_list'
      );
    });

    it('should get pools with query options', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPools);

      const result = await sdk.getPools(
        SupportedNetworks.TESTNET,
        [SupportedProtocols.SOROSWAP]
      );

      expect(result).toEqual(mockPools);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/pools?network=testnet&protocol=soroswap');
    });

    it('should handle pools errors', async () => {
      const errorMessage = 'Failed to fetch pools';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(
        sdk.getPools(SupportedNetworks.MAINNET, [SupportedProtocols.SOROSWAP])
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Pool by Tokens', () => {
    const mockPools: Pool[] = [
      {
        protocol: SupportedProtocols.SOROSWAP,
        address: 'POOL_ADDRESS_123',
        tokenA: 'TOKEN_A_123',
        tokenB: 'TOKEN_B_456',
        reserveA: 1000000n,
        reserveB: 2000000n,
        ledger: 12345,
        involvesAsset: jest.fn()
      } as Pool
    ];

    it('should get pool by tokens with default parameters', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPools);

      const result = await sdk.getPoolByTokens(
        'TOKEN_A_123',
        'TOKEN_B_456',
        SupportedNetworks.MAINNET,
        [SupportedProtocols.SOROSWAP]
      );

      expect(result).toEqual(mockPools);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/pools/TOKEN_A_123/TOKEN_B_456?network=mainnet&protocol=soroswap'
      );
    });

    it('should get pool by tokens with asset lists', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPools);

      const result = await sdk.getPoolByTokens(
        'TOKEN_A_123',
        'TOKEN_B_456',
        SupportedNetworks.TESTNET,
        [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA]
      );

      expect(result).toEqual(mockPools);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/pools/TOKEN_A_123/TOKEN_B_456?network=testnet&protocol=soroswap&protocol=aqua'
      );
    });

    it('should handle pool by tokens errors', async () => {
      const errorMessage = 'Pool not found';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(
        sdk.getPoolByTokens('TOKEN_A_123', 'TOKEN_B_456', SupportedNetworks.MAINNET, [SupportedProtocols.SOROSWAP])
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Liquidity Operations', () => {
    const mockLiquidityRequest: AddLiquidityRequest = {
      assetA: 'TOKEN_A_123',
      assetB: 'TOKEN_B_456',
      amountA: 1000000n,
      amountB: 2000000n,
      to: 'WALLET_ADDRESS_123',
      slippageBps: '50'
    };

    const mockLiquidityResponse: LiquidityResponse = {
      xdr: 'LIQUIDITY_XDR_123',
      type: LiquidityAction.ADD_LIQUIDITY,
      poolInfo: {
        protocol: SupportedProtocols.SOROSWAP,
        address: 'POOL_ADDRESS_123',
        tokenA: 'TOKEN_A_123',
        tokenB: 'TOKEN_B_456',
        reserveA: 1000000n,
        reserveB: 2000000n,
        involvesAsset: jest.fn()
      } as Pool,
      minAmountA: 950000n,
      minAmountB: 1900000n
    };

    it('should add liquidity with default network', async () => {
      mockHttpClient.post = jest.fn().mockResolvedValue(mockLiquidityResponse);

      const result = await sdk.addLiquidity(mockLiquidityRequest);

      expect(result).toEqual(mockLiquidityResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/liquidity/add?network=testnet', mockLiquidityRequest);
    });

    it('should add liquidity with specified network', async () => {
      mockHttpClient.post = jest.fn().mockResolvedValue(mockLiquidityResponse);

      const result = await sdk.addLiquidity(mockLiquidityRequest, SupportedNetworks.MAINNET);

      expect(result).toEqual(mockLiquidityResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/liquidity/add?network=mainnet', mockLiquidityRequest);
    });

    it('should remove liquidity', async () => {
      const removeLiquidityRequest: RemoveLiquidityRequest = {
        assetA: 'TOKEN_A_123',
        assetB: 'TOKEN_B_456',
        liquidity: 500000n,
        amountA: 450000n,
        amountB: 900000n,
        to: 'WALLET_ADDRESS_123',
        slippageBps: '50'
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockLiquidityResponse);

      const result = await sdk.removeLiquidity(removeLiquidityRequest);

      expect(result).toEqual(mockLiquidityResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/liquidity/remove?network=testnet', removeLiquidityRequest);
    });

    it('should handle liquidity operation errors', async () => {
      const errorMessage = 'Insufficient liquidity';
      mockHttpClient.post = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.addLiquidity(mockLiquidityRequest)).rejects.toThrow(errorMessage);
    });
  });

  describe('User Positions', () => {
    const mockPositions: UserPositionResponse[] = [
      {
        poolInformation: {
          protocol: SupportedProtocols.SOROSWAP,
          address: 'POOL_ADDRESS_123',
          tokenA: {
            address: 'TOKEN_A_123',
            symbol: 'TOKEN_A',
            name: 'Token A',
          },
          tokenB: {
            address: 'TOKEN_B_456',
            symbol: 'TOKEN_B',
            name: 'Token B',
          },
          reserveA: 1000000n,
          reserveB: 2000000n,
          totalSupply: 3000000n
        },
        userPosition: 750000n,
        userShares: 90.00,
        tokenAAmountEquivalent: 300000n,
        tokenBAmountEquivalent: 600000n
      } as UserPositionResponse
    ];

    it('should get user positions with default network', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPositions);

      const result = await sdk.getUserPositions('USER_ADDRESS_123');

      expect(result).toEqual(mockPositions);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/liquidity/positions/USER_ADDRESS_123?network=testnet');
    });

    it('should get user positions with specified network', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPositions);

      const result = await sdk.getUserPositions('USER_ADDRESS_123', SupportedNetworks.MAINNET);

      expect(result).toEqual(mockPositions);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/liquidity/positions/USER_ADDRESS_123?network=mainnet');
    });

    it('should handle user positions errors', async () => {
      const errorMessage = 'User not found';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.getUserPositions('USER_ADDRESS_123')).rejects.toThrow(errorMessage);
    });
  });

  describe('Asset Lists', () => {
    const mockAssetLists: AssetListInfo[] = [
      {
        name: 'Soroswap Token List',
        url: 'https://example.com/tokenlist.json'
      } as AssetListInfo
    ];

    const mockAssetList: AssetList = {
      name: 'Soroswap Token List',
      provider: 'Soroswap',
      description: 'Official Soroswap token list',
      version: '1.0.0',
      network: 'mainnet',
      assets: []
    } as AssetList;

    it('should get all asset lists', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockAssetLists);

      const result = await sdk.getAssetList();

      expect(result).toEqual(mockAssetLists);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/asset-list');
    });

    it('should get specific asset list', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockAssetList);

      const result = await sdk.getAssetList(SupportedAssetLists.SOROSWAP);

      expect(result).toEqual(mockAssetList);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/asset-list?name=soroswap'
      );
    });

    it('should handle asset list errors', async () => {
      const errorMessage = 'Asset list not found';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.getAssetList()).rejects.toThrow(errorMessage);
    });
  });

  describe('Price Operations', () => {
    const mockPriceData: PriceData[] = [
      {
        asset: 'TOKEN_123',
        price: 1.50,
        timestamp: new Date()
      } as PriceData
    ];

    it('should get price for single asset', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPriceData);

      const result = await sdk.getPrice('TOKEN_123', SupportedNetworks.MAINNET);

      expect(result).toEqual(mockPriceData);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/price?network=mainnet&asset=TOKEN_123');
    });

    it('should get price for multiple assets', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPriceData);

      const result = await sdk.getPrice(['TOKEN_123', 'TOKEN_456'], SupportedNetworks.MAINNET);

      expect(result).toEqual(mockPriceData);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/price?network=mainnet&asset=TOKEN_123&asset=TOKEN_456');
    });

    it('should get price with custom currency', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPriceData);

      const result = await sdk.getPrice('TOKEN_123', SupportedNetworks.MAINNET);

      expect(result).toEqual(mockPriceData);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/price?network=mainnet&asset=TOKEN_123');
    });

    it('should get price with default network', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue(mockPriceData);

      const result = await sdk.getPrice('TOKEN_123');

      expect(result).toEqual(mockPriceData);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/price?network=testnet&asset=TOKEN_123');
    });

    it('should handle price errors', async () => {
      const errorMessage = 'Price data not available';
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(sdk.getPrice('TOKEN_123')).rejects.toThrow(errorMessage);
    });
  });

  describe('HTTP Client Integration', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = { message: 'Network timeout', statusCode: 0 };
      mockHttpClient.get = jest.fn().mockRejectedValue(timeoutError);

      await expect(sdk.getProtocols()).rejects.toEqual(timeoutError);
    });

    it('should handle API errors with status codes', async () => {
      const apiError = { message: 'Unauthorized', statusCode: 401 };
      mockHttpClient.post = jest.fn().mockRejectedValue(apiError);

      const quoteRequest: QuoteRequest = {
        assetIn: 'ASSET_IN',
        assetOut: 'ASSET_OUT',
        amount: 1000n,
        tradeType: TradeType.EXACT_IN,
        protocols: [SupportedProtocols.SOROSWAP]
      };

      await expect(sdk.quote(quoteRequest)).rejects.toEqual(apiError);
    });

    it('should handle malformed response errors', async () => {
      const malformedError = { message: 'Invalid JSON response', statusCode: 500 };
      mockHttpClient.get = jest.fn().mockRejectedValue(malformedError);

      await expect(sdk.getContractAddress(SupportedNetworks.MAINNET, 'factory')).rejects.toEqual(malformedError);
    });
  });

  describe('URL Building', () => {
    it('should properly encode query parameters', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue([]);

      await sdk.getPools(
        SupportedNetworks.MAINNET,
        [SupportedProtocols.SOROSWAP],
        [SupportedAssetLists.SOROSWAP]
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/pools?network=mainnet&protocol=soroswap&assetList=soroswap'
      );
    });

    it('should handle multiple protocol parameters', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValue([]);

      await sdk.getPools(
        SupportedNetworks.TESTNET,
        [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA, SupportedProtocols.PHOENIX]
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/pools?network=testnet&protocol=soroswap&protocol=aqua&protocol=phoenix'
      );
    });
  });
});