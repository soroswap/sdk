# HTTP Client Module

> **Living document.** Read this before modifying the module. Update it in the same change whenever the module's behavior, endpoints, files, or dependencies change.

**Source:** `src/clients/http-client.ts` · **Last verified:** 2026-09-04

## Purpose

Thin axios wrapper that every SDK method goes through. It owns authentication headers, BigInt request serialization, error unwrapping and query-string construction. It is exported publicly (`src/index.ts:8`), so changing its behavior is a breaking change for consumers, not just an internal refactor.

## Structure

| File | Purpose |
|---|---|
| `src/clients/http-client.ts` | The entire module. One class, 85 lines. |

## Public surface

```ts
new HttpClient(baseURL: string, apiKey: string, timeout: number = 30000)       // src/clients/http-client.ts:10
get<T>(url: string, config?: AxiosRequestConfig): Promise<T>                   // src/clients/http-client.ts:56
post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>      // src/clients/http-client.ts:64
buildUrlWithQuery(baseUrl: string, params: Record<string, any>): string        // src/clients/http-client.ts:72
```

`get` and `post` return `response.data`, never the axios response (`:57-58`, `:65-66`).

## Key methods

- **`constructor(baseURL, apiKey, timeout)`** (`:10`) - creates the axios instance with `Content-Type: application/json` and `Authorization: Bearer ${apiKey}` (`:19-22`). The API key is baked into the instance at construction. There is no per-call key override and no refresh path.
- **`transformRequest` hook** (`:24-33`) - replaces axios's default body serializer with `JSON.stringify` using a replacer that converts `bigint` to its decimal string. This is the only reason `QuoteRequest.amount: bigint` works over the wire.
- **response interceptor** (`:37-49`) - on an HTTP error it rejects with `error.response.data`, the raw API body, and only falls back to the axios error when there was no response (`:41-47`).
- **`buildUrlWithQuery(baseUrl, params)`** (`:72`) - drops `undefined` and `null` entries (`:74`), expands array values into repeated keys such as `protocol=a&protocol=b` (`:77`), and `encodeURIComponent`s both key and value (`:77-79`). Returns `baseUrl` unchanged when nothing survives the filter (`:83`).

## Gotchas & invariants

- **Rejections are not `Error` objects.** The interceptor rejects with the parsed API response body (`:43`). Code written as `catch (e) { e.message }` will read `undefined` on any 4xx or 5xx. README.md:289 shows exactly that anti-pattern. Inspect the rejected value's own shape instead, and only expect an `Error` for network or timeout failures (`:46`).
- **Serialization is one-way.** There is a request-side BigInt replacer but no response-side reviver, and no `transformResponse` anywhere in `src/`. Response types that declare `bigint` (for example `Pool.reserveA` in `src/types/pools.ts:9`, `QuoteResponse.amountIn` in `src/types/quote.ts:127`) are compile-time claims only. At runtime you receive whatever `JSON.parse` produced, typically a `string` or `number`. Wrap in `BigInt(...)` before doing arithmetic.
- **The empty-string trap.** The filter at `:74` removes `undefined` and `null` but keeps `''`. An empty string is serialized as a real query param. That behavior is pinned by `tests/http-client.test.ts:162-171`, so it is intentional.
- `transformRequest` stringifies any non-null object (`:26-31`). Passing `FormData` or a stream would be mangled. This client is JSON only.
- Empty `params` produce no `?` at all (`:83`), which matters for callers that pass `{}` such as `getAssetList` with no name (`src/soroswap-sdk.ts:237`).

## Dependencies

- `axios ^1.10.0` (`package.json:65`). The sole runtime dependency of the package.
- Consumed by `SoroswapSDK` (`src/soroswap-sdk.ts:1`, `:38`). Re-exported for consumers at `src/index.ts:8`.

## Testing

- `tests/http-client.test.ts`, 227 lines, the best-covered file in the repo.
- Constructor config and interceptor registration: `:35-52`.
- GET and POST happy paths, config passthrough and error paths: `:53-118`.
- `buildUrlWithQuery` including arrays, encoding, null filtering and the empty-string case: `:119-171`.
- Auth header presence: `:209-219`.
- **Known gaps.** `tests/http-client.test.ts` mocks `axios.create` (`:5`, `:22`), so the registered functions are never invoked. The "BigInt serialization" test at `:172-192` only asserts `post` was called with the original object (`:189`); the replacer at `src/clients/http-client.ts:27-29` is not executed. The "Error transformation" tests at `:193-208` reject with plain `Error`s, so the `error.response.data` branch (`src/clients/http-client.ts:41-43`), the one consumers actually hit, is untested.
