# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Entry summary

TypeScript client for the Soroswap DEX and exchange aggregator on Stellar. Published as `@soroswap/sdk`, version `0.5.0` (`package.json:2-3`). CommonJS build only, Node `>=22` (`tsconfig.json:4`, `package.json:67-69`). Sole runtime dependency is `axios` (`package.json:64-66`).
Public surface: one class `SoroswapSDK` with 14 async methods (`src/soroswap-sdk.ts:88-301`), plus `HttpClient` and every type, all re-exported from `src/index.ts:2-12`. `SoroswapSDK` is also the default export (`src/index.ts:11-12`).
Consumes the Soroswap REST API. Default base URL `https://api.soroswap.finance`, overridable via `config.baseUrl` (`src/soroswap-sdk.ts:35`); auth is a Bearer API key set once at construction (`src/clients/http-client.ts:21`).
The `factory`, `router` and `aggregator` contract addresses are fetched from that API at runtime, never hardcoded here (`src/soroswap-sdk.ts:88-92`).
The SDK never signs. `build()`, `addLiquidity()` and `removeLiquidity()` return unsigned XDR; sign externally, then submit with `send(xdr, network?)` (`src/soroswap-sdk.ts:137`).
Per-module detail lives in `docs/modules/README.md`. Read that router before editing any module.

## Project Overview

This is the official TypeScript SDK for Soroswap.Finance - a DEX and exchange aggregator built on Stellar using Soroban smart contracts. The SDK provides server-side access to trading operations, liquidity management, market data, and balances.

## Development Commands

All from `package.json:12-26`.

- `pnpm run build` / `pnpm run build:watch` - Compile TypeScript to `dist/`
- `pnpm run clean` - Remove `dist/` (rimraf)
- `pnpm test` or `pnpm run test:unit` - Unit tests with mocked dependencies
- `pnpm run test:integration` - Integration tests against the real API (requires `SOROSWAP_API_KEY`)
- `pnpm run test:all` - Both suites
- `pnpm run test:watch` / `pnpm run test:coverage` - Watch mode / coverage report
- `pnpm run lint` / `pnpm run lint:fix` - ESLint on `src/**/*.ts`
- `pnpm run prepare` - Builds before publishing; `pnpm run prepublishOnly` - Tests and lints before publishing

## Architecture

### Core Components
- **SoroswapSDK** (`src/soroswap-sdk.ts:27`) - Main SDK class that orchestrates all operations
- **HttpClient** (`src/clients/http-client.ts:7`) - Axios wrapper with Bearer auth, BigInt request serialization, error unwrapping and query building

### API Operations
Grouped by module; see `docs/modules/README.md` for the full signature and endpoint table.
- **Trading**: `quote()`, `build()`, `send()` - `docs/modules/trading.md`
- **Pools & Liquidity**: `getPools()`, `getPoolByTokens()`, `addLiquidity()`, `removeLiquidity()`, `getUserPositions()` - `docs/modules/liquidity-pools.md`
- **Market Data**: `getAssetList()`, `getPrice()` - `docs/modules/assets-prices.md`
- **Balances**: `getBalances()`, `getTokenBalance()` - `docs/modules/balances.md`
- **System**: `getProtocols()`, `getContractAddress()` - `docs/modules/sdk-core.md`

### Authentication Flow
1. SDK initializes with an API key (`src/soroswap-sdk.ts:31-42`)
2. HttpClient sets the `Authorization: Bearer` header once (`src/clients/http-client.ts:21`)
3. All API calls reuse that same key. No token refresh or session management.

### Type System
All types live in `src/types/` and are re-exported from `src/types/index.ts:1-7`: `assets.ts`, `balances.ts`, `common.ts` (shared enums and `SoroswapSDKConfig`), `pools.ts`, `price.ts`, `quote.ts`, `send.ts`. Each module doc lists the types its API area owns.

## Testing Strategy

- **Unit tests** in `tests/`, configured by `jest.config.js`. They mock `axios` (`tests/setup.ts:10-25`) and typically replace `(sdk as any).httpClient.get` with a `jest.fn()`, then assert on the exact URL built (`tests/soroswap-sdk.test.ts:53`, `:80-85`).
- **Integration tests** in `tests/integration/`, configured by `jest.integration.config.js`. They hit the real API and require `SOROSWAP_API_KEY` (`tests/integration/setup.ts:14`). May be flaky due to network or API changes.
- `tests/integration/README.md` is stale: it says integration tests need `SOROSWAP_EMAIL` and `SOROSWAP_PASSWORD` (`tests/integration/README.md:29-30`). The only variable the setup actually checks is `SOROSWAP_API_KEY`.

## Environment Configuration

Integration tests read a `.env` file via dotenv (`tests/integration/setup.ts:7-8`); `.env` is gitignored.

```bash
export SOROSWAP_API_KEY="sk_..."
```

SDK config (`src/types/common.ts:35-40`), with defaults applied in `src/soroswap-sdk.ts:32-36`:
- `apiKey` (required) - Bearer credential. Conventionally starts with `sk_`, but nothing in `src/` validates the prefix; a bad key fails at the API.
- `baseUrl` - defaults to `https://api.soroswap.finance`
- `defaultNetwork` - defaults to `SupportedNetworks.MAINNET`
- `timeout` - defaults to `30000` ms

## Cross-repo dependencies

- **this repo -> Soroswap REST API (`api.soroswap.finance`)**: every method is a call to this service. Base URL at `src/soroswap-sdk.ts:35`; endpoint list per module in `docs/modules/README.md`.
- **this repo -> Soroswap on-chain contracts (`factory`, `router`, `aggregator`)**: addresses resolved at runtime through `GET /api/{network}/{contractName}` (`src/soroswap-sdk.ts:88-92`). No contract address is committed in this repo.
- **this repo -> `soroswap/token-list` repo**: `SupportedAssetLists.SOROSWAP` is that repo's raw `tokenList.json` URL (`src/types/common.ts:9`). The SDK does not fetch it; it maps the URL to the API slug `soroswap` (`src/soroswap-sdk.ts:55-56`).
- **this repo -> third-party asset lists**: stellar.expert, lobstr.co and amm-api.aqua.network URLs used the same identifier-only way (`src/types/common.ts:10-12`).
- **consumers -> this repo**: published to npm as `@soroswap/sdk` (`package.json:2`) from `github.com/soroswap/sdk` (`package.json:41-44`). It also ships an agent skill at `skills/soroswap-sdk/SKILL.md`, installable with `npx skills add soroswap/sdk` (`soroswap-sdk-skill.md:8`).
- **DeFindex and other PaltaLabs repos**: None. A case-insensitive grep for `defindex` and `paltalabs` across `src/`, `tests/`, `docs/`, `skills/`, `examples/`, `package.json`, `README.md` and `CHANGELOG.md` returns no matches; the only hit in the tree is this file.

## Key Implementation Notes

### Authentication
- Server-side use is recommended: an API key in browser code is visible to anyone (`skills/soroswap-sdk/SKILL.md:34-36`).
- Keep keys in environment variables, never in code.

### Amount Handling
- `QuoteRequest.amount` and the liquidity request amounts are `bigint` (`src/types/quote.ts:11`, `src/types/pools.ts:40-41`, `:57-59`). Only `slippageBps` differs: a `number` on quotes (`src/types/quote.ts:16`) and a `string` on liquidity requests (`src/types/pools.ts:43`).
- BigInt is serialized on the way out by `HttpClient`'s `transformRequest` (`src/clients/http-client.ts:24-33`). There is **no** matching response reviver, so `bigint`-typed response fields arrive as JSON strings or numbers at runtime.

### Error Handling
- On an HTTP error the response interceptor rejects with the raw API response body, not an `Error` (`src/clients/http-client.ts:41-43`). `catch (e) { e.message }` reads `undefined`. Only network and timeout failures reject with a real `Error` (`:46`).
- Wrap all calls in try/catch. There is no retry logic anywhere in `src/`.

### Network Support
- MAINNET and TESTNET (`src/types/common.ts:21-24`), defaulted in the constructor and overridable per call.
- Exception: `getPools` and `getPoolByTokens` take `network` as a required positional argument and ignore `defaultNetwork` (`src/soroswap-sdk.ts:152-156`, `:173-178`).

### Known stale docs in this repo
`README.md` predates the 0.4.0 and 0.5.0 changes and contradicts the source in several places (package name, `send()` arity, liquidity amount types, `ExactInBuildTradeReturn`, no balances section). `examples/` is stale the same way: `examples/frontend-widget/README.md:58` calls `send()` with three arguments and `examples/backend-example.js:49` passes `slippageBps` as a string. Prefer the module docs and the source. Details are recorded in the relevant `docs/modules/*.md` gotchas sections.

## Development Patterns

### Adding New API Methods
1. Define TypeScript interfaces in the appropriate `src/types/` file and export them from `src/types/index.ts`
2. Add the method to the matching section of the `SoroswapSDK` class
3. Build the URL with `this.httpClient.buildUrlWithQuery(...)`, then call `get`/`post`
4. Add unit tests with mocked responses; consider an integration test
5. Update the module's doc under `docs/modules/` in the same change

## Module Documentation Convention (MANDATORY)

Every module has a living doc at `docs/modules/<module>.md` (flat file, one per module). `docs/modules/README.md` is the index that routes a module's source path to its doc. These are the fast on-ramp for anyone, human or agent, touching a module.

**Progressive disclosure - do NOT load all docs at once.** When you're about to touch a module, open `docs/modules/README.md`, find the ONE doc matching the code you're changing, and read only that. Never pull the whole `docs/modules/` folder into context.

**The workflow rule:**
1. **Before modifying a module, read its `docs/modules/<module>.md` first.** It holds the file map, key methods with `file:line`, dependencies, and gotchas.
2. **After modifying a module, update its doc in the same change.** New or removed endpoints, changed behavior, new gotchas, dependency changes: all go into the doc before the work is done. Bump the "Last verified" date.
3. Doc claims must be verified against source and cite `file:line`. Never document something you haven't confirmed exists.
4. **Adding a new module?** Create its `docs/modules/<module>.md` and add a row to `docs/modules/README.md` in the same change.

Docs follow a shared template: Purpose, Structure, Endpoints/Public surface, Key methods (`file:line`), Dependencies, Gotchas & invariants, Testing.
