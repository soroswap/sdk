/**
 * Soroswap SDK Backend Example
 * 
 * This example demonstrates how to use the Soroswap SDK
 * in a Node.js backend environment with API key authentication.
 */

const { SoroswapSDK, SupportedNetworks, SupportedProtocols, TradeType } = require('@soroswap/sdk');

async function main() {
  // Initialize the SDK with your API key
  const sdk = new SoroswapSDK({
    apiKey: process.env.SOROSWAP_API_KEY || 'sk_your_api_key_here',
    baseUrl: process.env.SOROSWAP_API_URL, // Optional: 'http://localhost:3000' for local dev
    defaultNetwork: SupportedNetworks.MAINNET,
    timeout: 30000 // 30 seconds timeout
  });

  // Common baseUrl examples:
  // - Production: 'https://api.soroswap.finance' (default)

  try {
    console.log('🚀 Soroswap SDK Example');
    console.log('========================');

    // 1. Get available protocols
    console.log('\n1. Getting available protocols...');
    const protocols = await sdk.getProtocols(SupportedNetworks.MAINNET);
    console.log('Available protocols:', protocols);

    // 2. Get contract addresses
    console.log('\n2. Getting contract addresses...');
    const factoryAddress = await sdk.getContractAddress(SupportedNetworks.MAINNET, 'factory');
    const routerAddress = await sdk.getContractAddress(SupportedNetworks.MAINNET, 'router');
    console.log('Factory address:', factoryAddress.address);
    console.log('Router address:', routerAddress.address);

    // 3. Get a quote for a token swap
    console.log('\n3. Getting quote for USDC -> EURC...');
    const USDC = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';
    const EURC = 'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV';

    const quoteRequest = {
      assetIn: USDC,
      assetOut: EURC,
      amount: 1000000000n, // 100 USDC (7 decimals)
      tradeType: TradeType.EXACT_IN,
      protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
      slippageBps: '50', // 0.5%
    };

    const quote = await sdk.quote(quoteRequest);
    console.log('Quote received:');
    console.log('- Asset In:', quote.assetIn);
    console.log('- Asset Out:', quote.assetOut);
    console.log('- Amount In:', quote.amountIn);
    console.log('- Amount Out:', quote.amountOut);
    console.log('- Trade Type:', quote.tradeType);
    console.log('- Price Impact:', quote.priceImpactPct + '%');
    console.log('- Route Plans:', quote.routePlan.length);

    // 4. Build the transaction from the quote
    console.log('\n4. Building transaction...');
    const buildRequest = {
      quote: quote,
      from: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Your wallet address
      to: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'   // Recipient address (optional)
    };

    const buildResponse = await sdk.build(buildRequest);
    console.log('Transaction built successfully!');
    console.log('XDR length:', buildResponse.xdr.length);

    // 5. At this point, you would:
    //    - Sign the XDR with your wallet/keypair
    //    - Send the signed transaction using sdk.send()
    console.log('\n5. Next steps:');
    console.log('- Sign the XDR with your wallet');
    console.log('- Send signed transaction using sdk.send(signedXdr)');

    // Example of sending (commented out as it requires a signed XDR):
    /*
    const signedXdr = 'YOUR_SIGNED_XDR_HERE';
    const sendResult = await sdk.send(signedXdr);
    console.log('Transaction sent:', sendResult);
    */

    // 6. Get pools information
    console.log('\n6. Getting pools information...');
    const pools = await sdk.getPools(
      SupportedNetworks.MAINNET,
      [SupportedProtocols.SOROSWAP],
      undefined, // No asset list filter
      { limit: 5 } // Get first 5 pools
    );
    console.log(`Found ${pools.length} pools`);
    if (pools.length > 0) {
      console.log('First pool:', {
        protocol: pools[0].protocol,
        tokenA: pools[0].tokenA.substring(0, 10) + '...',
        tokenB: pools[0].tokenB.substring(0, 10) + '...',
        reserveA: pools[0].reserveA,
        reserveB: pools[0].reserveB
      });
    }

    console.log('\n✅ Example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Handle specific error types
    if (error.statusCode === 401) {
      console.error('Authentication failed - check your API key');
    } else if (error.statusCode === 404) {
      console.error('Resource not found');
    } else if (error.message.includes('route not found')) {
      console.error('No trading route available between these tokens');
    }
  }
}

// Express.js backend integration example
function createExpressEndpoints(app) {
  const sdk = new SoroswapSDK({
    apiKey: process.env.SOROSWAP_API_KEY,
    baseUrl: process.env.SOROSWAP_API_URL, // Optional: for custom API endpoints
    defaultNetwork: SupportedNetworks.MAINNET
  });

  // Endpoint to get a quote and build transaction
  app.post('/api/quote-and-build', async (req, res) => {
    try {
      const { assetIn, assetOut, amount, walletAddress } = req.body;

      // Get quote
      const quote = await sdk.quote({
        assetIn,
        assetOut,
        amount: BigInt(amount),
        tradeType: TradeType.EXACT_IN,
        protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA]
      });

      // Build transaction
      const buildResponse = await sdk.build({
        quote,
        from: walletAddress
      });

      // Return only necessary data to frontend
      res.json({
        success: true,
        quote: {
          assetIn: quote.assetIn,
          assetOut: quote.assetOut,
          tradeType: quote.tradeType
        },
        xdr: buildResponse.xdr
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Endpoint to send signed transaction
  app.post('/api/send-transaction', async (req, res) => {
    try {
      const { signedXdr } = req.body;

      const result = await sdk.send(signedXdr);

      res.json({
        success: true,
        result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createExpressEndpoints
};