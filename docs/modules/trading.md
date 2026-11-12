# Trading Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/soroswap-sdk.ts:108-143`, `src/types/quote.ts`, `src/types/send.ts` · **Last verified:** 2026-09-04

## Purpose

The three-step swap flow: price a trade, turn the priced quote into an unsigned XDR, submit the signed XDR. This is the module most consumers integrate. The SDK never signs; signing happens outside it, between `build()` and `send()`.

## Structure

| File | Purpose |
|---|---|
| `src/soroswap-sdk.ts:108-143` | `quote`, `build`, `send`. |
| `src/types/quote.ts` | Quote request and response types, trade shapes, route plan. |
| `src/types/send.ts` | Submission request and the normalized transaction response. |

## Public surface and endpoints

| Signature | HTTP | Path | Line |
|---|---|---|---|
| `quote(quoteRequest: QuoteRequest, network?: SupportedNetworks): Promise<QuoteResponse>` | POST | `/quote?network={network}` | `src/soroswap-sdk.ts:111`, `:113`, `:121` |
| `build(buildQuoteRequest: BuildQuoteRequest, network?: SupportedNetworks): Promise<BuildQuoteResponse>` | POST | `/quote/build?network={network}` | `src/soroswap-sdk.ts:127`, `:129-130` |
| `send(xdr: string, network?: SupportedNetworks): Promise<SendTransactionResponse>` | POST | `/send?network={network}` | `src/soroswap-sdk.ts:137`, `:139-142` |

All three fall back to `this.defaultNetwork` when `network` is omitted (`:112`, `:128`, `:138`).

## Types

- **`QuoteRequest`** (`src/types/quote.ts:8-20`) - required: `assetIn`, `assetOut`, `amount: bigint`, `tradeType: TradeType`, `protocols: SupportedProtocols[]`. Optional: `parts`, `slippageBps: number`, `maxHops`, `assetList`, `feeBps`, `gaslessTrustline: GaslessTrustlineType`.
- **`QuoteResponse`** (`src/types/quote.ts:149`) - discriminated union of `ExactInQuoteResponse` (`:139`) and `ExactOutQuoteResponse` (`:144`), keyed on `tradeType`. Shared fields come from `BaseQuoteResponse` (`:125-137`): `assetIn`, `amountIn`, `assetOut`, `amountOut`, `otherAmountThreshold`, `priceImpactPct`, `platform`, `routePlan`, plus optional `trustlineInfo`, `platformFee`, `gaslessTrustline`.
- **`rawTrade`** is `ExactInTrade | HorizonStrictPaths` for exact-in (`:141`) and `ExactOutTrade | HorizonStrictPaths` for exact-out (`:146`). The Horizon shapes (`:79-105`) appear for SDEX routes; the Soroban shapes (`:60`, `:77`) for contract routes.
- **`ExactInTrade` / `ExactOutTrade`** are themselves unions of a path variant and a distribution variant, mutually exclusive via `never` (`:50-60`, `:67-77`).
- **`BuildQuoteRequest`** (`src/types/quote.ts:22-29`) - `quote: QuoteResponse` (pass the whole response back), plus optional `from`, `to`, `referralId`, `sponsor`, `signedUserXdr`.
- **`BuildQuoteResponse`** (`src/types/quote.ts:31-35`) - `xdr`, `action`, `description`.
- **`SendTransactionResponse`** (`src/types/send.ts:62-95`) - `txHash`, `success`, `result: TransactionResult | null`, `ledger`, `createdAt`, `latestLedger`, `latestLedgerCloseTime`, `feeBump`, `feeCharged`, `protocol`, `submissionMethod`.
- **`TransactionResult`** (`src/types/send.ts:52-56`) - discriminated on `type`: `SwapResult` (`:14`), `AddLiquidityResult` (`:32`), `RemoveLiquidityResult` (`:43`), `UnknownResult` (`:25`).

## Key methods

- **`quote(quoteRequest, network?)`** (`src/soroswap-sdk.ts:111`) - shallow-copies the request and rewrites `assetList` through `transformAssetList` before POSTing (`:116-119`). The copy is shallow, so the caller's `assetList` array is left alone but nested objects are shared.
- **`build(buildQuoteRequest, network?)`** (`src/soroswap-sdk.ts:127`) - no transformation at all. The `quote` field is forwarded verbatim, which is why you must pass the exact `QuoteResponse` object you got back.
- **`send(xdr, network?)`** (`src/soroswap-sdk.ts:137`) - wraps the string in `SendRequest` (`:141`) and POSTs it. Two parameters only.

## Gotchas & invariants

- **`send()` is `(xdr, network?)`.** The old third argument for LaunchTube was removed in 0.4.0 (`CHANGELOG.md:60-63`). Three callers in this repo's own docs and examples are stale and will misbehave: `README.md:209` passes `false` as the second arg, `examples/frontend-widget/README.md:58` passes `100`, and `skills/soroswap-sdk/SKILL.md:70` still passes three arguments. Each puts a boolean or number where a `SupportedNetworks` string is expected, which silently changes the target network.
- **`amount` must be a real `bigint`.** `src/types/quote.ts:11` requires it, and only `HttpClient`'s replacer (`src/clients/http-client.ts:27-29`) makes it serializable. A `number` compiles only if cast and loses precision above 2^53.
- **`slippageBps` is a `number`** (`src/types/quote.ts:16`). `README.md:124` and `examples/backend-example.js:49` both show `slippageBps: '50'` as a string. The string form is wrong for `quote`. Note the liquidity types do use a string for the same field; see [liquidity-pools.md](liquidity-pools.md).
- **Do not reconstruct the quote before calling `build`.** Round-tripping `QuoteResponse` through `JSON.parse(JSON.stringify(...))` destroys the `bigint` fields the API expects to see returned.
- **`QuoteResponse` amounts are typed `bigint` but arrive as JSON.** There is no response reviver anywhere in `src/`. See the serialization gotcha in [http-client.md](http-client.md).
- **Narrow on `tradeType` before touching `rawTrade`.** `if (quote.tradeType === TradeType.EXACT_IN)` gives you `ExactInQuoteResponse`. `README.md:420-437` narrows to a type named `ExactInBuildTradeReturn` and reads `quote.trade.expectedAmountOut`; neither the type nor that field exists in `src/types/`.
- **`referralId` pairs with `feeBps`.** `README.md:139` states it is required when the quote carries `feeBps`. Not enforced in this repo's code; the API enforces it.
- `GaslessTrustlineType` currently has one member, `CREATE`; `REMOVE` is commented out (`src/types/quote.ts:3-6`).

## Dependencies

- [`sdk-core`](sdk-core.md) for `transformAssetList`, the network default and config.
- [`http-client`](http-client.md) for transport and BigInt request serialization.
- Signing is the consumer's job and needs `@stellar/stellar-sdk` or a wallet. That package is **not** a dependency of this repo (`package.json:64-66`).

## Testing

- Quote, build and send unit tests with mocked axios: `tests/soroswap-sdk.test.ts:147-319`.
- Asset-list enum transformation and mixed enum/string input: `tests/quote.test.ts:84-166`.
- Integration test hitting the real API for a mainnet quote: `tests/integration/quote.integration.test.ts:75-131`. Needs `SOROSWAP_API_KEY` (`tests/integration/setup.ts:14`).
- No test submits a real transaction through `send()`.
