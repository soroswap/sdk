# Soroswap SDK
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/soroswap/sdk)
[![npm version](https://img.shields.io/npm/v/soroswap-sdk)](https://www.npmjs.com/package/@soroswap/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript SDK for [Soroswap.Finance](https://soroswap.finance) - The first DEX and exchange aggregator built on Stellar, powered by smart contracts on Soroban.

## 🌟 Features

- **🔐 Simple API Key Authentication**: Secure API key-based authentication
- **💱 Trading Operations**: Get quotes, build transactions, send them to the network
- **💧 Liquidity Management**: Add/remove liquidity and track positions
- **📊 Market Data**: Access pools, prices, and asset information
- **🔒 Server-Side Focused**: Secure handling of API keys and sensitive operations
- **📝 TypeScript Support**: Full type safety with comprehensive interfaces
- **⚡ Lightweight**: No complex authentication flows or token management
- **🧪 Well Tested**: Comprehensive unit test coverage

## 🚀 Installation

```bash
pnpm install soroswap-sdk
```

## 📖 Quick Start

```typescript
import { SoroswapSDK, SupportedNetworks, SupportedProtocols, TradeType } from '@soroswap/sdk';

// Initialize the SDK
const soroswapClient = new SoroswapSDK({
  apiKey: 'sk_your_api_key_here'
});

// Get a quote for a swap
const quote = await soroswapClient.quote({
  assetIn: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
  assetOut: 'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV',
  amount: 10000000n, // Note: Amount must be a BigInt
  tradeType: TradeType.EXACT_IN,
  protocols: [SupportedProtocols.SDEX, SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
});

// Build the transaction XDR from the quote
const buildResponse = await soroswapClient.build({
  quote,
  from: 'YOUR_WALLET_ADDRESS',
  to: 'RECIPIENT_ADDRESS'
});

// Sign the transaction with your preferred signer
const signedXdr = await yourSigner.sign(buildResponse.xdr);

// Send the signed transaction
const result = await soroswapClient.send(signedXdr, false); // launchtube = false
console.log('Transaction result:', result);
```

## 🔧 Configuration

### SDK Configuration Options

```typescript
interface SoroswapSDKConfig {
  apiKey: string;                   // Your Soroswap API key (starts with 'sk_')
  baseUrl?: string;                 // Custom API base URL (defaults to 'https://api.soroswap.finance')
  defaultNetwork?: SupportedNetworks;  // SupportedNetworks.MAINNET | SupportedNetworks.TESTNET
  timeout?: number;                // Request timeout in ms (defaults to 30000) you might want to adjust this if using launchtube
}
```

### Environment Variables

For better security, you can use environment variables:

```typescript
const soroswapClient = new SoroswapSDK({
  apiKey: process.env.SOROSWAP_API_KEY!,
  baseUrl: process.env.SOROSWAP_API_URL, // Optional: for localhost or custom API
  defaultNetwork: process.env.NODE_ENV === 'production' 
    ? SupportedNetworks.MAINNET 
    : SupportedNetworks.TESTNET
});

// Example for local development:
const localClient = new SoroswapSDK({
  apiKey: 'sk_local_api_key',
  baseUrl: 'http://localhost:3000',
  defaultNetwork: SupportedNetworks.TESTNET
});
```

## 📚 API Reference

### Authentication

The SDK uses API key authentication - no complex authentication flows needed:

```typescript
// Simply initialize with your API key
const soroswapClient = new SoroswapSDK({
  apiKey: 'sk_your_api_key_here'
});
```

### Trading Operations

#### Get Available Protocols

```typescript
const protocols = await soroswapClient.getProtocols(SupportedNetworks.MAINNET);
// Returns: ['sdex', 'soroswap', 'phoenix', 'aqua']
```

#### Get Quote

```typescript
const quote = await soroswapClient.quote({
  assetIn: 'TOKEN_A_CONTRACT',
  assetOut: 'TOKEN_B_CONTRACT',
  amount: 1000000n, // BigInt required
  tradeType: TradeType.EXACT_IN,
  protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
  slippageBps: '50', // 0.5% in basis points
  maxHops: 2,
  feeBps: 30, // Optional fee in basis points
});
```

#### Build Transaction

After getting a quote, build the transaction XDR:

```typescript
const buildResponse = await soroswapClient.build({
  quote: quote,
  from: 'YOUR_WALLET_ADDRESS',
  to: 'RECIPIENT_ADDRESS', // Optional, defaults to 'from'
  referralId: 'REFERRAL_WALLET_ADDRESS' // Required if quote includes feeBps
});

// buildResponse.xdr contains the transaction ready for signing
```

#### Send Signed Transaction

```typescript
const result = await soroswapClient.send(
  signedXdr,           // The signed transaction XDR
  false,               // launchtube: boolean (default false)
  SupportedNetworks.MAINNET  // Optional network override
);
```

### Pool Operations

#### Get Pools

```typescript
// Get all pools for specific protocols
const pools = await soroswapClient.getPools(
  SupportedNetworks.MAINNET,
  [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
  [SupportedAssetLists.SOROSWAP] // Optional asset list filter
);

// Get specific pool for token pair
const pool = await soroswapClient.getPoolByTokens(
  'TOKEN_A_CONTRACT',
  'TOKEN_B_CONTRACT',
  SupportedNetworks.MAINNET,
  [SupportedProtocols.SOROSWAP]
);
```

### Liquidity Operations

#### Add Liquidity

**Important**: Before adding liquidity, you should fetch the existing pool to calculate the proper token proportions. The amounts must maintain the current pool ratio, otherwise the transaction will fail during simulation.

```typescript
// First, get the current pool to understand the ratio
const pools = await soroswapClient.getPoolByTokens(
  'TOKEN_A_CONTRACT',
  'TOKEN_B_CONTRACT',
  SupportedNetworks.MAINNET,
  [SupportedProtocols.SOROSWAP]
);

if (pools.length > 0) {
  const pool = pools[0];
  const ratio = Number(pool.reserveB) / Number(pool.reserveA);
  
  // Calculate proportional amounts
  const amountA = '1000000';
  const amountB = (Number(amountA) * ratio).toString();
  
  const addLiquidityTx = await soroswapClient.addLiquidity({
    assetA: 'TOKEN_A_CONTRACT',
    assetB: 'TOKEN_B_CONTRACT',
    amountA: amountA,
    amountB: amountB,
    to: 'YOUR_WALLET_ADDRESS',
    slippageBps: '50' // 0.5%
  });

  // Sign and send the transaction
  const signedXdr = await yourSigner.sign(addLiquidityTx.xdr);
  const result = await soroswapClient.send(signedXdr, false);
}
```

> **Note**: All liquidity transactions are simulated before execution. If the amounts don't match the required proportions or if there are insufficient funds, the transaction will return an error during simulation.

#### Remove Liquidity

```typescript
const removeLiquidityTx = await soroswapClient.removeLiquidity({
  assetA: 'TOKEN_A_CONTRACT',
  assetB: 'TOKEN_B_CONTRACT',
  liquidity: '500000',
  amountA: '450000',
  amountB: '900000',
  to: 'YOUR_WALLET_ADDRESS',
  slippageBps: '50'
});
```

#### Get User Positions

```typescript
const positions = await soroswapClient.getUserPositions(
  'USER_WALLET_ADDRESS',
  SupportedNetworks.MAINNET
);
```

### Market Data

#### Get Asset Prices

```typescript
// Single asset price
const prices = await soroswapClient.getPrice(
  'TOKEN_CONTRACT_ADDRESS',
  SupportedNetworks.MAINNET
);

// Multiple asset prices
const prices = await soroswapClient.getPrice([
  'TOKEN_A_CONTRACT',
  'TOKEN_B_CONTRACT'
], SupportedNetworks.MAINNET);
```

#### Get Asset Lists

```typescript
// Get all available asset lists metadata
const assetListsInfo = await soroswapClient.getAssetList();

// Get specific asset list
const soroswapAssets = await soroswapClient.getAssetList(SupportedAssetLists.SOROSWAP);
```

### System Information

#### Get Contract Addresses

```typescript
const factoryAddress = await soroswapClient.getContractAddress(SupportedNetworks.MAINNET, 'factory');
const routerAddress = await soroswapClient.getContractAddress(SupportedNetworks.MAINNET, 'router');
const aggregatorAddress = await soroswapClient.getContractAddress(SupportedNetworks.MAINNET, 'aggregator');
```

## 🔐 Security Best Practices

1. **Environment Variables**: Store API keys in environment variables, not in code
2. **Server-Side Only**: This SDK is designed for server-side use only
3. **API Key Security**: Keep your API keys secure and never commit them to version control
4. **Error Handling**: Always wrap API calls in try-catch blocks

```typescript
try {
  const quote = await soroswapClient.quote(quoteParams);
  const buildResponse = await soroswapClient.build({ quote, from: walletAddress });
  // Handle success
} catch (error) {
  console.error('Quote/build failed:', error.message);
  // Handle error
}
```

## 🏗️ Development

### Building

```bash
pnpm run build
```

### Testing

The SDK includes two types of tests:

#### Unit Tests (Mocked)
Fast tests that mock all external dependencies:

```bash
# Run unit tests (default)
pnpm test

# Run with coverage
pnpm run test:coverage

# Watch mode for development
pnpm run test:watch
```

#### Integration Tests (Real API)
Tests that actually call the Soroswap API:

```bash
# Set up API key first
export SOROSWAP_API_KEY="sk_your_api_key_here"

# Run integration tests
pnpm run test:integration

# Run both unit and integration tests
pnpm run test:all
```

**Note**: Integration tests require a valid Soroswap API key and may fail due to network issues or API changes. See [Integration Test Documentation](./tests/integration/README.md) for detailed setup.

### Linting

```bash
pnpm run lint
pnpm run lint:fix
```

## 🌐 Frontend Integration Considerations

While this SDK is server-side focused, you can create secure frontend integrations:

### Recommended Architecture

```typescript
// Backend API endpoint
app.post('/api/quote', async (req, res) => {
  try {
    const soroswapClient = new SoroswapSDK({
      apiKey: process.env.SOROSWAP_API_KEY!
    });
    
    const quote = await soroswapClient.quote(req.body);
    const buildResponse = await soroswapClient.build({
      quote,
      from: req.body.walletAddress
    });
    
    // Only return the XDR and quote data, not sensitive info
    res.json({
      xdr: buildResponse.xdr,
      quote: {
        assetIn: quote.assetIn,
        assetOut: quote.assetOut,
        tradeType: quote.tradeType
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Frontend widget
async function getQuoteAndBuild(quoteParams) {
  const response = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteParams)
  });
  return response.json();
}
```

## 📊 Type Definitions

The SDK exports comprehensive TypeScript types:

```typescript
import {
  SoroswapSDK,
  SoroswapSDKConfig,
  SupportedNetworks,
  SupportedProtocols,
  SupportedAssetLists,
  TradeType,
  QuoteRequest,
  QuoteResponse,
  BuildQuoteRequest,
  BuildQuoteResponse,
  Pool,
  UserPosition,
  PriceData,
  AssetList,
  AssetListInfo,
  // ... and many more
} from 'soroswap-sdk';
```

### Example: Working with Types

```typescript
import { 
  QuoteRequest, 
  TradeType, 
  SupportedProtocols,
  ExactInBuildTradeReturn 
} from 'soroswap-sdk';

const quoteRequest: QuoteRequest = {
  assetIn: 'TOKEN_A',
  assetOut: 'TOKEN_B',
  amount: 1000000n,
  tradeType: TradeType.EXACT_IN,
  protocols: [SupportedProtocols.SOROSWAP]
};

const quote = await soroswapClient.quote(quoteRequest);

// Type-safe access to quote properties
if (quote.tradeType === TradeType.EXACT_IN) {
  const exactInQuote = quote as ExactInBuildTradeReturn;
  console.log('Expected output:', exactInQuote.trade.expectedAmountOut);
}
```

## 🔗 Links

- [Soroswap.Finance](https://soroswap.finance)
- [Documentation](https://docs.soroswap.finance)
- [API Documentation](https://api.soroswap.finance)
- [GitHub Repository](https://github.com/soroswap/sdk)

---

Built with ❤️ by the Soroswap team.