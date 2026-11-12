# Liquidity & Pools Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/soroswap-sdk.ts:145-226`, `src/types/pools.ts` · **Last verified:** 2026-09-04

## Purpose

Reads pool state and builds liquidity transactions. Two read methods return `Pool[]`; two write methods return an unsigned XDR the caller must sign and submit through [`send()`](trading.md); one method reports a user's LP positions.

## Structure

| File | Purpose |
|---|---|
| `src/soroswap-sdk.ts:145-186` | `getPools`, `getPoolByTokens`. |
| `src/soroswap-sdk.ts:188-226` | `addLiquidity`, `removeLiquidity`, `getUserPositions`. |
| `src/types/pools.ts` | `Pool`, `LiquidityAction`, request and response shapes, `UserPositionResponse`. |

## Public surface and endpoints

| Signature | HTTP | Path | Line |
|---|---|---|---|
| `getPools(network: SupportedNetworks, protocols: string[], assetList?: (SupportedAssetLists \| string)[]): Promise<Pool[]>` | GET | `/pools?network=&protocol=…` | `src/soroswap-sdk.ts:152`, `:166-167` |
| `getPoolByTokens(assetA: string, assetB: string, network: SupportedNetworks, protocols: string[]): Promise<Pool[]>` | GET | `/pools/{assetA}/{assetB}?network=&protocol=…` | `src/soroswap-sdk.ts:173`, `:184-185` |
| `addLiquidity(liquidityData: AddLiquidityRequest, network?: SupportedNetworks): Promise<LiquidityResponse>` | POST | `/liquidity/add?network=` | `src/soroswap-sdk.ts:195`, `:200-201` |
| `removeLiquidity(liquidityData: RemoveLiquidityRequest, network?: SupportedNetworks): Promise<LiquidityResponse>` | POST | `/liquidity/remove?network=` | `src/soroswap-sdk.ts:207`, `:212-213` |
| `getUserPositions(address: string, network?: SupportedNetworks): Promise<UserPositionResponse[]>` | GET | `/liquidity/positions/{address}?network=` | `src/soroswap-sdk.ts:219`, `:224-225` |

## Types

- **`Pool`** (`src/types/pools.ts:4-29`) - `protocol`, `address`, `tokenA`, `tokenB`, `reserveA: bigint`, `reserveB: bigint`, plus a long optional tail covering AMM variants: `reserveLp`, `stakeAddress`, `poolType`, `fee`, `totalFeeBps`, a third asset (`tokenC`, `reserveC`), stableswap amplification (`futureA`, `futureATime`, `initialA`, `initialATime`), precision multipliers and `poolHash`. Also declares `involvesAsset(asset: string): boolean` (`:28`).
- **`AddLiquidityRequest`** (`:37-44`) - `assetA`, `assetB`, `amountA: bigint`, `amountB: bigint`, `to`, `slippageBps?: string`.
- **`RemoveLiquidityRequest`** (`:54-62`) - `assetA`, `assetB`, `liquidity: bigint`, `amountA: bigint`, `amountB: bigint`, `to`, `slippageBps?: string`.
- **`LiquidityResponse`** (`:46-52`) - `xdr`, `type: LiquidityAction`, `poolInfo: Pool`, `minAmountA: bigint`, `minAmountB: bigint`.
- **`LiquidityAction`** (`:31-35`) - `create_pool`, `add_liquidity`, `remove_liquidity`.
- **`UserPositionResponse`** (`:64-70`) - `poolInformation` (a distinct, non-exported `PoolInformation` shape at `:72-81` whose `tokenA`/`tokenB` are `AssetNameSymbol` objects, not strings), `userPosition: bigint`, `userShares: number`, `tokenAAmountEquivalent`, `tokenBAmountEquivalent`.

## Key methods

- **`getPools(network, protocols, assetList?)`** (`src/soroswap-sdk.ts:152`) - builds `params` as `any` (`:157`) and only attaches `assetList` after running it through `transformAssetList` when provided (`:162-164`). `protocols` is an array, so `buildUrlWithQuery` expands it to repeated `protocol=` keys (`src/clients/http-client.ts:77`). Note the query key is singular `protocol`, the argument is plural.
- **`getPoolByTokens(assetA, assetB, network, protocols)`** (`src/soroswap-sdk.ts:173`) - asset addresses go into the path unencoded by the SDK (`:184`); only the query part is encoded. Returns an array, not a single pool, even for one pair.
- **`addLiquidity` / `removeLiquidity`** (`:195`, `:207`) - pure passthrough POSTs. No client-side proportion or slippage math happens here. The returned `xdr` is unsigned.

## Gotchas & invariants

- **`network` is required and positional on both pool reads.** `getPools(network, protocols)` and `getPoolByTokens(a, b, network, protocols)` never consult `this.defaultNetwork`. Every other method in the SDK does. This asymmetry is the single easiest mistake in this module.
- **`Pool.involvesAsset()` does not exist at runtime.** The interface declares it (`src/types/pools.ts:28`), but `HttpClient.get` returns axios's parsed JSON directly (`src/clients/http-client.ts:57-58`) and nothing hydrates the objects into a class. Calling it on an API result throws. It only "works" in the unit tests, which hand-build mocks with a `jest.fn()` for it (`tests/soroswap-sdk.test.ts:330`, `:405`, `:471`).
- **Amounts are `bigint`, `slippageBps` is a `string`.** That mix is intentional in `src/types/pools.ts:40-43`. `README.md:198-205` and `:218-226` pass string amounts, which do not type-check against the current interfaces.
- **Ratio matters.** `README.md:179` warns that add-liquidity amounts must match the current pool ratio or simulation fails. Read the pool first, compute the ratio, then call. Nothing in this repo enforces it.
- **Reserves typed `bigint` arrive as JSON.** Same one-way serialization issue described in [http-client.md](http-client.md). `README.md:192` does `Number(pool.reserveB) / Number(pool.reserveA)`, which works precisely because the runtime value is not actually a `bigint`.
- `PoolInformation` is declared without `export` (`src/types/pools.ts:72`), so consumers can only reach it structurally through `UserPositionResponse`.

## Dependencies

- [`sdk-core`](sdk-core.md) for `transformAssetList` and network handling.
- [`http-client`](http-client.md) for transport and array query expansion.
- [`trading`](trading.md): the `xdr` from `addLiquidity`/`removeLiquidity` is submitted with `send()`, and its `SendTransactionResponse.result` can be an `AddLiquidityResult` or `RemoveLiquidityResult` (`src/types/send.ts:32`, `:43`).
- `Pool.protocol` and `PoolInformation.protocol` are `SupportedProtocols` (`src/types/common.ts:26`).

## Testing

- `getPools` with and without asset-list filters, string arrays and error paths: `tests/soroswap-sdk.test.ts:320-394`.
- `getPoolByTokens`: `tests/soroswap-sdk.test.ts:395-450`.
- `addLiquidity` and `removeLiquidity`: `tests/soroswap-sdk.test.ts:451-521`.
- `getUserPositions`: `tests/soroswap-sdk.test.ts:522-574`.
- Integration: pools fetch at `tests/integration/quote.integration.test.ts:132-164`, and a real pool-then-add-liquidity-XDR flow at `:326-367`. The specific-token-pair integration test at `:165-199` is commented out.
