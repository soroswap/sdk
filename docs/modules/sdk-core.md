# SDK Core Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/index.ts`, `src/soroswap-sdk.ts:27-93`, `src/types/common.ts` · **Last verified:** 2026-09-04

## Purpose

Owns the package's entry point, the `SoroswapSDK` constructor and its config defaults, the shared enums every other module depends on, and two system reads (`getContractAddress`, `getProtocols`). Blast radius is the whole package: changing the constructor, the default base URL or the `SupportedNetworks` enum breaks every consumer.

## Structure

| File | Purpose |
|---|---|
| `src/index.ts` | Public exports. Named `SoroswapSDK`, `HttpClient`, `export * from './types'`, plus `SoroswapSDK` as default export (`src/index.ts:2-12`). |
| `src/soroswap-sdk.ts` | The single public class. Core section is the constructor and system reads. |
| `src/types/common.ts` | Shared enums and `SoroswapSDKConfig`. |

## Public surface

```ts
new SoroswapSDK(config: SoroswapSDKConfig)                                     // src/soroswap-sdk.ts:31
getContractAddress(network: SupportedNetworks,
                   contractName: 'factory' | 'router' | 'aggregator')
  : Promise<{address: string}>                                                 // src/soroswap-sdk.ts:88
getProtocols(network?: SupportedNetworks): Promise<string[]>                   // src/soroswap-sdk.ts:102
```

`SoroswapSDKConfig` (`src/types/common.ts:35-40`): `apiKey: string` (required), `baseUrl?: string`, `defaultNetwork?: SupportedNetworks`, `timeout?: number`.

Exported enums, all in `src/types/common.ts`:

| Enum | Values | Line |
|---|---|---|
| `TradeType` | `EXACT_IN`, `EXACT_OUT` | `common.ts:2` |
| `SupportedAssetLists` | four full URLs: soroswap token-list, stellar.expert, lobstr, aqua | `common.ts:8` |
| `SupportedPlatforms` | `sdex`, `aggregator`, `router` | `common.ts:15` |
| `SupportedNetworks` | `testnet`, `mainnet` | `common.ts:21` |
| `SupportedProtocols` | `soroswap`, `phoenix`, `aqua`, `comet`, `sushi`, `sdex` | `common.ts:26` |

## Endpoints called

| Method | Path | SDK method |
|---|---|---|
| GET | `/api/{network}/{contractName}` | `getContractAddress` (`src/soroswap-sdk.ts:92`) |
| GET | `/protocols?network={network}` | `getProtocols` (`src/soroswap-sdk.ts:104-105`) |

## Key methods

- **`constructor(config)`** (`src/soroswap-sdk.ts:31`) - applies three defaults: `defaultNetwork` falls back to `SupportedNetworks.MAINNET` (`:32`), `baseUrl` to `https://api.soroswap.finance` (`:35`), `timeout` to `30000` ms (`:36`). It then builds one `HttpClient` and holds it privately (`:38-42`). There is no lazy init and no retry layer.
- **`transformAssetList(assetList)`** (`src/soroswap-sdk.ts:48`, private) - maps `SupportedAssetLists` enum values, which are full URLs, down to the short slugs the API expects: `soroswap`, `stellar_expert`, `lobstr`, `aqua` (`:55-62`). Any string that is not one of those URLs passes through untouched (`:67`). Callers are `quote` (`:118`), `getPools` (`:163`) and `getAssetList` (`:236`).
- **`getContractAddress(network, contractName)`** (`src/soroswap-sdk.ts:88`) - the only method whose path is prefixed with `/api` (`:92`). Everything else hits the bare path. Do not "normalize" this without checking the API.

## Dependencies

- Depends on [`http-client`](http-client.md) for every call.
- Depended on by every other module doc here; they all call methods on the same class instance.
- External: the Soroswap API at `https://api.soroswap.finance` (`src/soroswap-sdk.ts:35`), overridable via `config.baseUrl`.
- On-chain: `factory`, `router` and `aggregator` contract addresses are resolved through the API, not hardcoded here (`src/soroswap-sdk.ts:90`).
- Runtime dependency is `axios` only (`package.json:64-66`). Node `>=22` (`package.json:67-69`).

## Gotchas & invariants

- **The API key is never validated.** README and CLAUDE.md say keys "must start with `sk_`", but no code in `src/` checks the prefix. A malformed key fails at the API, not at construction.
- **`getProtocols` returns `string[]`, not `SupportedProtocols[]`** (`src/soroswap-sdk.ts:102`). Cast at your own risk. A new server-side protocol will appear here before the enum knows about it.
- **`getPools` and `getPoolByTokens` do not fall back to `defaultNetwork`.** They take `network` as a required positional arg. Every other method treats it as an optional override. See [liquidity-pools.md](liquidity-pools.md).
- The default export and the named `SoroswapSDK` export are the same class (`src/index.ts:2`, `:11-12`). Do not add a second default.
- `tsconfig.json:4` sets `"module": "commonjs"`. The package ships `dist/index.js` + `dist/index.d.ts` (`package.json:5-6`). There is no ESM build.

## Testing

- Constructor defaults and overrides: `tests/soroswap-sdk.test.ts:56-76`, `tests/quote.test.ts:16-34`.
- Contract addresses, all three names plus error path: `tests/soroswap-sdk.test.ts:77-117`.
- Protocols, default and explicit network plus error path: `tests/soroswap-sdk.test.ts:118-146`.
- Asset-list transform is covered indirectly through `quote`: `tests/quote.test.ts:84-166`.
- Unit tests mock `axios` wholesale in `tests/setup.ts:10-25`, so nothing here exercises real serialization.
