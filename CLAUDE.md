# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the official TypeScript SDK for Soroswap.Finance - a DEX and exchange aggregator built on Stellar using Soroban smart contracts. The SDK provides server-side access to trading operations, liquidity management, market data, and authentication.

## Development Commands

### Build and Development
- `pnpm run build` - Compile TypeScript to JavaScript in dist/
- `pnpm run build:watch` - Watch mode compilation
- `pnpm run clean` - Remove dist/ directory

### Testing
- `pnpm test` or `pnpm run test:unit` - Run unit tests with mocked dependencies
- `pnpm run test:integration` - Run integration tests against real API (requires credentials)
- `pnpm run test:all` - Run both unit and integration tests
- `pnpm run test:watch` - Watch mode for unit tests
- `pnpm run test:coverage` - Generate coverage report

### Code Quality
- `pnpm run lint` - Run ESLint on TypeScript files
- `pnpm run lint:fix` - Fix ESLint issues automatically

### Publishing
- `pnpm run prepare` - Builds before publishing
- `pnpm run prepublishOnly` - Runs tests and linting before publishing

## Architecture

### Core Components
- **SoroswapSDK** (`src/soroswap-sdk.ts`) - Main SDK class that orchestrates all operations
- **HttpClient** (`src/clients/http-client.ts`) - Centralized HTTP client with API key authentication

### API Operations
The SDK provides methods for:
- **Trading**: quote(), build(), send() - Get quotes, build transactions, submit to network
- **Liquidity**: addLiquidity(), removeLiquidity(), getUserPositions()
- **Market Data**: getPools(), getPrice(), getAssetList()
- **System**: getProtocols(), getContractAddress()

### Authentication Flow
1. SDK initializes with API key
2. HttpClient sets Authorization header with Bearer token
3. All API calls use the same API key for authentication
4. No token refresh or session management needed

### Type System
Comprehensive TypeScript types are defined in `src/types/`:
- `common.ts` - Core enums and base types
- `quote.ts` - Trading quote types
- `pools.ts` - Pool and liquidity types
- `assets.ts` - Asset and price types
- `auth.ts` - Authentication types
- `send.ts` - Transaction submission types

## Testing Strategy

### Unit Tests
- Located in `tests/` directory
- Mock all external dependencies using Jest
- Focus on SDK logic and type safety
- Configuration in `jest.config.js`

### Integration Tests
- Located in `tests/integration/`
- Test against real Soroswap API
- Require environment variables: `SOROSWAP_EMAIL`, `SOROSWAP_PASSWORD`
- Configuration in `jest.integration.config.js`
- May be flaky due to network/API dependencies

## Environment Configuration

### Required Environment Variables for Integration Tests
```bash
export SOROSWAP_API_KEY="sk_your_api_key_here"
```

### SDK Configuration
The SDK accepts configuration including:
- `apiKey` - API key for authentication (must start with 'sk_')
- `baseUrl` - Custom API base URL (optional, defaults to 'https://api.soroswap.finance')
- `defaultNetwork` - MAINNET or TESTNET
- `timeout` - Request timeout (default 30s)

## Build Configuration

### TypeScript
- Target: ES2020
- CommonJS modules
- Strict mode enabled
- Generates declaration files and source maps
- Output to `dist/` directory

### Package Structure
- Entry point: `dist/index.js`
- Types: `dist/index.d.ts`
- Published files: `dist/`, `README.md`, `LICENSE`

## Key Implementation Notes

### Authentication
- Server-side only - API keys should never be exposed to frontend
- Simple API key authentication with Bearer token
- Use environment variables for API keys in production

### Amount Handling
- All amounts must be BigInt when passed to quote() method
- String amounts used for liquidity operations
- Proper type checking enforced in TypeScript

### Error Handling
- All API operations can throw errors
- Wrap calls in try-catch blocks
- Integration tests may fail due to network issues
- API key authentication errors will be returned immediately

### Network Support
- Supports both MAINNET and TESTNET
- Default network configurable in SDK constructor
- Network can be overridden per API call

## Development Patterns

### Adding New API Methods
1. Define TypeScript interfaces in appropriate `src/types/` file
2. Add method to `SoroswapSDK` class
3. Use `this.httpClient` for HTTP calls
4. Add unit tests with mocked responses
5. Consider adding integration test if appropriate

### Type Safety
- All API responses should have corresponding TypeScript interfaces
- Use union types for different response formats (e.g., ExactIn vs ExactOut trades)
- Export all types from `src/types/index.ts`

### Error Boundaries
- HTTP errors are handled by HttpClient
- Authentication errors are returned immediately (no retry logic needed)
- Network timeouts should be handled gracefully