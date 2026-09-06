# Balances Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/soroswap-sdk.ts:263-301`, `src/types/balances.ts` · **Last verified:** 2026-09-04

## Purpose

Reads token balances for a wallet, either the full set or one token. Added in 0.4.0 (`CHANGELOG.md:21`, `:25-28`). Read-only, no transaction building.

## Structure

| File | Purpose |
|---|---|
| `src/soroswap-sdk.ts:267-301` | `getBalances`, `getTokenBalance`. |
| `src/types/balances.ts` | `BalanceAssetInfo`, `TokenBalance`, `BalancesResponse`, `SingleBalanceResponse`. |

## Public surface and endpoints

| Signature | HTTP | Path | Line |
|---|---|---|---|
| `getBalances(walletAddress: string, network?: SupportedNetworks): Promise<BalancesResponse>` | GET | `/balances/{walletAddress}?network=` | `src/soroswap-sdk.ts:272`, `:277-281` |
| `getTokenBalance(walletAddress: string, tokenAddress: string, network?: SupportedNetworks): Promise<SingleBalanceResponse>` | GET | `/balances/{walletAddress}/{tokenAddress}?network=` | `src/soroswap-sdk.ts:290`, `:296-300` |

Both default to `this.defaultNetwork` (`:276`, `:295`).

## Types

- **`TokenBalance`** (`src/types/balances.ts:22-33`) - `asset: BalanceAssetInfo`, and four amount fields, all `string`: `amount` (human readable, decimals applied), `rawAmount` (smallest unit), `available`, `availableRaw`.
- **`BalanceAssetInfo`** (`:4-17`) - `code`, `issuer: string | null`, `contract`, `name: string | null`, `icon: string | null`, `decimals: number`.
- **`BalancesResponse`** (`:38-47`) - `wallet`, `network`, `balances: TokenBalance[]`, `updatedAt: number` (ms since epoch).
- **`SingleBalanceResponse`** (`:52-61`) - same envelope but a single `balance: TokenBalance`.

## Key methods

- **`getBalances(walletAddress, network?)`** (`src/soroswap-sdk.ts:272`) - the doc comment at `:269` states the address may be a Stellar account (`G...`) or a contract (`C...`).
- **`getTokenBalance(walletAddress, tokenAddress, network?)`** (`src/soroswap-sdk.ts:290`) - the doc comment at `:292` states `tokenAddress` accepts either a contract id (`C...`) or `CODE:ISSUER` form.

## Gotchas & invariants

- **This is the only module with zero unit tests.** Confirmed by grep: neither `getBalances` nor `getTokenBalance` appears anywhere under `tests/`. Treat any change here as unverified until you add coverage.
- **`amount` versus `available`.** For XLM they differ: `available` subtracts the account's base and subentry reserves (`src/types/balances.ts:29-30`). Use `available` for anything a user can actually spend, not `amount`.
- **All amounts are strings, not `bigint`.** Unlike pools and quotes, this module's types are honest about the wire format (`:25-32`). Parse with `BigInt(rawAmount)` for exact math; never with `parseFloat`.
- **`issuer` is null for native XLM and for pure Soroban tokens** (`:7-8`). Do not key a map on `issuer`. Key on `contract`, which is always present (`:10-11`).
- **`CODE:ISSUER` in the path is not encoded by the SDK.** Path segments are interpolated raw (`src/soroswap-sdk.ts:278`, `:297`); only query values go through `encodeURIComponent` (`src/clients/http-client.ts:79`). The colon survives in practice, but any future token identifier with a `/` or `?` would break the URL.
- **Not documented in README.md.** The README's API Reference has no balances section, so the README is not a source of truth for this module. `skills/soroswap-sdk/SKILL.md:272` and `:348` do mention it.

## Dependencies

- [`sdk-core`](sdk-core.md) for the network default.
- [`http-client`](http-client.md) for transport.
- No dependency on any other module. Nothing else in `src/` consumes these responses.

## Testing

- **None.** No unit test and no integration test references either method.
- If adding tests, follow the house pattern: reach into the private client with `(sdk as any).httpClient` (`tests/soroswap-sdk.test.ts:53`), replace `.get` with a `jest.fn()`, then assert on the exact URL string it was called with (`tests/soroswap-sdk.test.ts:80-85`). URL construction is the only logic in these two methods.
