# Module Documentation Index

Living docs, one per module. **Read the relevant doc before modifying a module; update it in the same change.** See "Module Documentation Convention" in `../../CLAUDE.md` for the workflow.

This repo is a single npm package (`@soroswap/sdk`) whose public surface is one class, `SoroswapSDK`. Modules below are split by API area, so most rows point at a line range of `src/soroswap-sdk.ts` plus the types file that area owns.

| Doc | Module | One-liner |
|---|---|---|
| [sdk-core.md](sdk-core.md) | `src/index.ts`, `src/soroswap-sdk.ts:27-93`, `:102-106` | Package exports, SDK construction and config, network defaults, asset-list transform, `getContractAddress`, `getProtocols`. |
| [http-client.md](http-client.md) | `src/clients/http-client.ts` | Axios wrapper: Bearer auth, BigInt request serialization, error unwrapping, query-string builder. |
| [trading.md](trading.md) | `src/soroswap-sdk.ts:108-143`, `src/types/quote.ts`, `src/types/send.ts` | Swap flow: `quote()` then `build()` then `send()`. |
| [liquidity-pools.md](liquidity-pools.md) | `src/soroswap-sdk.ts:145-226`, `src/types/pools.ts` | Pool reads and liquidity add/remove/positions. |
| [assets-prices.md](assets-prices.md) | `src/soroswap-sdk.ts:228-261`, `src/types/assets.ts`, `src/types/price.ts` | Asset list metadata and spot prices. |
| [balances.md](balances.md) | `src/soroswap-sdk.ts:263-301`, `src/types/balances.ts` | Wallet balance reads, whole wallet or single token. |
