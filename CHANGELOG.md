# Changelog

All notable changes to the Soroswap SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Balances Methods
- `getBalances(walletAddress, network?)` - Fetch all token balances for a wallet
- `getTokenBalance(walletAddress, tokenAddress, network?)` - Fetch a specific token balance
- New types: `BalanceAssetInfo`, `TokenBalance`, `BalancesResponse`, `SingleBalanceResponse`

#### Send Response Types
- `SendTransactionResponse` - Unified response type for `send()` method
- `TransactionResult` - Discriminated union for parsed results:
  - `SwapResult` - `{ type: 'swap', amountIn, amountOut, intermediateAmounts? }`
  - `AddLiquidityResult` - `{ type: 'add_liquidity', amountA, amountB, shares }`
  - `RemoveLiquidityResult` - `{ type: 'remove_liquidity', amountA, amountB }`
  - `UnknownResult` - `{ type: 'unknown', value }`

### Changed

#### `send()` Method
- Return type changed from `Promise<any>` to `Promise<SendTransactionResponse>`
- Response is now fully typed with parsed transaction results

**Usage:**
```typescript
const response = await sdk.send(signedXdr);

// Type-safe access
console.log(response.txHash);
console.log(response.success);

// Discriminated union for results
if (response.result?.type === 'swap') {
  console.log(`Swapped ${response.result.amountIn} for ${response.result.amountOut}`);
} else if (response.result?.type === 'add_liquidity') {
  console.log(`Added liquidity, received ${response.result.shares} LP tokens`);
}
```

### Breaking Changes
- `send()` return type is now `Promise<SendTransactionResponse>` instead of `Promise<any>`
- Consumers relying on raw response fields (`hash`, `status`, `returnValue`) must update to new field names (`txHash`, `success`, `result`)
