# Assets & Prices Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/soroswap-sdk.ts:228-261`, `src/types/assets.ts`, `src/types/price.ts` · **Last verified:** 2026-09-04

## Purpose

Market metadata: which curated token lists exist and what is in them, and spot prices for a set of assets. Read-only. Nothing here builds a transaction.

## Structure

| File | Purpose |
|---|---|
| `src/soroswap-sdk.ts:232-261` | `getAssetList`, `getPrice`. |
| `src/types/assets.ts` | `AssetInfo`, `AssetList`, `AssetListInfo`, `AssetNameSymbol`. |
| `src/types/price.ts` | `PriceData`. |

## Public surface and endpoints

| Signature | HTTP | Path | Line |
|---|---|---|---|
| `getAssetList(name?: SupportedAssetLists): Promise<AssetList \| AssetListInfo[]>` | GET | `/asset-list` or `/asset-list?name={slug}` | `src/soroswap-sdk.ts:235`, `:238-244` |
| `getPrice(assets: string \| string[], network?: SupportedNetworks): Promise<PriceData[]>` | GET | `/price?network=&asset=…` | `src/soroswap-sdk.ts:250`, `:259-260` |

## Types

- **`AssetList`** (`src/types/assets.ts:12-20`) - `name` and `assets: AssetInfo[]` are required. `provider`, `description`, `version`, `feedback`, `network` are optional.
- **`AssetInfo`** (`:1-10`) - every field is optional: `code`, `issuer`, `contract`, `name`, `org`, `domain`, `icon`, `decimals`. Do not assume `contract` or `decimals` are present.
- **`AssetListInfo`** (`:22-25`) - `{ name, url }`. This is the shape returned when you call `getAssetList()` with no argument.
- **`AssetNameSymbol`** (`:27-31`) - `{ address, name, symbol }`. Used by `PoolInformation` in [liquidity-pools](liquidity-pools.md), not by this module's responses.
- **`PriceData`** (`src/types/price.ts:1-5`) - `{ asset: string, price: number | null, timestamp: Date }`.

## Key methods

- **`getAssetList(name?)`** (`src/soroswap-sdk.ts:235`) - converts a `SupportedAssetLists` enum URL to its API slug via `transformAssetList([name])[0]` (`:236`), then branches on presence of `name` to pick the response generic (`:240-244`). With no argument it passes an empty params object, and `buildUrlWithQuery` then returns the bare path with no `?` (`src/clients/http-client.ts:83`).
- **`getPrice(assets, network?)`** (`src/soroswap-sdk.ts:250`) - normalizes a single string into a one-element array (`:256`) so the query always uses repeated `asset=` keys. Always returns an array, even for one asset.

## Gotchas & invariants

- **`getAssetList` returns a union.** `AssetList | AssetListInfo[]` (`src/soroswap-sdk.ts:235`). TypeScript cannot narrow it from the argument, so callers must narrow manually, for example with `Array.isArray(result)`. The two branches at `:240-244` differ only in the generic passed to `HttpClient.get`, which is erased at runtime.
- **`getAssetList` takes no network parameter.** Asset lists are network-agnostic in this API. Do not add a network arg without confirming the endpoint supports it.
- **`price` can be `null`** (`src/types/price.ts:3`). Assets with no market data come back with a null price, not an omitted entry. Check before arithmetic.
- **`timestamp` is typed `Date` but arrives as a JSON string.** There is no response reviver in `src/`; see [http-client.md](http-client.md). Wrap in `new Date(...)` before calling date methods.
- **The enum values are full URLs, not slugs.** `SupportedAssetLists.SOROSWAP` is `https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json` (`src/types/common.ts:9`). Only `transformAssetList` knows the URL to slug mapping (`src/soroswap-sdk.ts:55-62`). A raw slug string passed in also works, because unrecognized strings pass through (`:67`).
- The four list URLs point at external services outside Soroswap's control: stellar.expert, lobstr.co and amm-api.aqua.network (`src/types/common.ts:10-12`). They are identifiers here, not fetched by this SDK.

## Dependencies

- [`sdk-core`](sdk-core.md) for `transformAssetList` and `SupportedAssetLists`.
- [`http-client`](http-client.md) for transport.
- Asset lists feed the optional `assetList` filter on `quote` (`src/soroswap-sdk.ts:118`) and `getPools` (`:163`).

## Testing

- Asset lists, both branches plus error path: `tests/soroswap-sdk.test.ts:575-619`.
- Prices, single asset, multiple assets and default network: `tests/soroswap-sdk.test.ts:620-672`.
- Query encoding for these endpoints: `tests/soroswap-sdk.test.ts:704-730`.
- The integration tests for asset lists and prices are all commented out (`tests/integration/quote.integration.test.ts:200-275`), so no live coverage.
