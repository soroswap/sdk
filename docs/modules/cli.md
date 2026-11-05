# CLI Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/cli/` · **Last verified:** 2026-10-24

## Purpose

The `soroswap` command, shipped as a `bin` of this same package (`package.json:7-9`). It wraps `SoroswapSDK` for shells, scripts and AI agents: non-interactive, `-f json` on every command, errors as `{"error": "..."}`. It is the only part of the package that signs, and the only part that depends on `@stellar/stellar-sdk` (`package.json:69`). `src/index.ts` does not import it, so library consumers never load it.

## Structure

| File | Purpose |
|---|---|
| `src/cli/index.ts` | Entry point (shebang). Wires real dependencies (`fetch`, stdin, `SoroswapSDK`, Stellar RPC) into `run()`. |
| `src/cli/run.ts` | Command table (`:12`), global flags (`:15`), help, argument parsing with `node:util` `parseArgs`, output and error handling (`run`, `:95`). |
| `src/cli/context.ts` | `CliDeps` (`:13`, the test seam), `CliContext` (`:25`, lazy SDK, signer, asset resolver), flag helpers including `readAmount` (`:57`). |
| `src/cli/commands/quote.ts` | `quote`, plus `runQuote` / `summarizeQuote` shared with `swap`. |
| `src/cli/commands/swap.ts` | `swap`, with `--dry-run`. |
| `src/cli/commands/market.ts` | `price`, `balances`, `pools`. |
| `src/cli/commands/sign.ts` | `sign --xdr [--submit]`. |
| `src/cli/assets.ts` | Asset input to contract id and decimals (`AssetResolver.resolve`, `:63`). |
| `src/cli/amounts.ts` | `parseUnits`, `parseRawAmount`, `formatUnits`. |
| `src/cli/signer.ts` | `Signer` interface (`:13`) and the `SIGNER_FACTORIES` registry (`:53`). |
| `src/cli/stellar.ts` | Network passphrases, default RPC URLs (`:18`), `decimals()` reads and local simulation (`createStellarClient`, `:56`). |
| `src/cli/output.ts` | JSON serialization (bigint safe) and text tables. |
| `src/cli/errors.ts` | `CliError` / `UsageError` and `errorMessage` (`:26`), which flattens raw API error bodies. |

## Commands and the SDK calls behind them

| Command | SDK methods |
|---|---|
| `quote` | `getProtocols` (only without `--protocols`), `quote` |
| `swap` | `quote`, `build`, then `send` unless `--dry-run` |
| `sign` | `send` only with `--submit` |
| `price` | `getPrice` |
| `balances` | `getBalances` |
| `pools` | `getProtocols` (only without `--protocols`), `getPools` or `getPoolByTokens` |

Calls outside the Soroswap API, none of which need a key:
- Mainnet token list: `SupportedAssetLists.SOROSWAP` (the raw `soroswap/token-list` JSON). Testnet token list: `GET {SOROSWAP_API_URL}/api/tokens` (`src/cli/assets.ts:29-40`).
- Stellar RPC: `simulateTransaction` for `decimals()` on contracts outside the token list, and for the `--dry-run` simulation (`src/cli/stellar.ts:56-89`).

## Gotchas & invariants

- **JSON contract.** In JSON mode stdout carries exactly one JSON document, success or error (`src/cli/run.ts:147`). Exit codes: `0` ok, `1` runtime (API, network, signing, failed simulation), `2` usage. Keep these stable; agents parse them.
- **`--dry-run` exits 1 when the local simulation fails**, but still prints the XDR (`src/cli/commands/swap.ts:93`). Classic (SDEX) transactions are not simulated; `simulation` is `null`.
- **The API key is read lazily** (`CliContext.sdk()`), so `--help`, `sign` without `--submit` and argument errors never ask for one.
- **Decimals.** `XLM` and `CODE:ISSUER` are always 7 (Stellar Asset Contracts). Contract ids use the token list, then an on-chain `decimals()` read. Token-list symbols fall back to 7 when the list omits `decimals`.
- **`STELLAR_RPC_URL` is one URL for whichever `--network` is passed.** Pointing it at a mainnet RPC and running `--network testnet` gives wrong decimals and simulations.
- **The API simulates and assembles `build()` output already.** The CLI's own simulation in `--dry-run` is a second check against current ledger state, not a prerequisite for signing.
- **Jest and `@stellar/stellar-sdk`.** The SDK pulls ESM-only packages; `jest.config.js` compiles them with ts-jest (`transformIgnorePatterns`). Moving to `@stellar/stellar-sdk` 17 adds more ESM-only packages (`@exodus/bytes`) that the pattern does not cover yet.

## Testing

- `tests/cli.test.ts`: amount conversion, argument parsing and exit codes, the JSON shape of every command, `--dry-run` never signing, signing with `STELLAR_SECRET_KEY` (signature verified), and the unknown-signer error. All through `run()` with fake `CliDeps`; no network.
- End to end by hand: `pnpm run build && node dist/cli/index.js --help`.
