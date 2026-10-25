import { StrKey } from '@stellar/stellar-sdk';
import { formatUnits } from '../amounts';
import { list, optionalInt } from '../context';
import { UsageError } from '../errors';
import { hasSigner } from '../signer';
import { table } from '../output';
import { Command } from './command';

const numberOrNull = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const priceCommand: Command = {
  name: 'price',
  summary: 'USD price of one or more assets',
  help: `Usage: soroswap price <asset> [<asset> ...]

Assets are contract ids (C...), XLM, CODE:ISSUER, or token-list symbols.
priceUsd is null when the API has no price for the asset. Needs SOROSWAP_API_KEY.

Example:
  soroswap price XLM USDC -f json`,
  options: {},
  positionals: [1, 50],
  async run(ctx, _values, positionals) {
    const assets = await Promise.all(positionals.map(p => ctx.assets.resolve(p)));
    const prices = await ctx.sdk().getPrice(assets.map(a => a.contract), ctx.network);
    const rows = assets.map(a => {
      const found = prices.find(p => p.asset === a.contract);
      return { asset: a.contract, code: a.code, priceUsd: numberOrNull(found?.price) };
    });
    return { data: rows, human: table(rows, ['code', 'priceUsd', 'asset']) };
  },
};

export const balancesCommand: Command = {
  name: 'balances',
  summary: 'Token balances of an address',
  help: `Usage: soroswap balances [<address>] [--include-zero]

Balances of every token in the API's asset list for a G... or C... address.
Without <address>, uses the configured signer's address. Zero balances are
hidden unless --include-zero. Needs SOROSWAP_API_KEY.

Example:
  soroswap balances GABC... -f json`,
  options: { 'include-zero': { type: 'boolean' } },
  positionals: [0, 1],
  async run(ctx, values, positionals) {
    let address = positionals[0];
    if (!address) {
      if (!hasSigner(ctx.deps.env)) throw new UsageError('Pass an <address> or configure STELLAR_SECRET_KEY');
      address = await ctx.signer().publicKey();
    }
    if (!StrKey.isValidEd25519PublicKey(address) && !StrKey.isValidContract(address)) {
      throw new UsageError(`"${address}" is not a Stellar address (G... or C...)`);
    }
    const res = await ctx.sdk().getBalances(address, ctx.network);
    const rows = res.balances
      .filter(b => values['include-zero'] === true || BigInt(b.rawAmount || '0') > 0n)
      .map(b => ({
        code: b.asset.code,
        contract: b.asset.contract,
        issuer: b.asset.issuer ?? null,
        decimals: b.asset.decimals,
        amount: formatUnits(b.rawAmount, b.asset.decimals),
        amountRaw: String(b.rawAmount),
        available: formatUnits(b.availableRaw, b.asset.decimals),
        availableRaw: String(b.availableRaw),
      }));
    return {
      data: { address, network: ctx.network, balances: rows },
      human: `${address} on ${ctx.network}\n\n${table(rows, ['code', 'amount', 'available', 'contract'])}`,
    };
  },
};

export const poolsCommand: Command = {
  name: 'pools',
  summary: 'Liquidity pools, all or for one pair',
  help: `Usage: soroswap pools [<assetA> <assetB>] [--protocols <list>] [--asset-list <list>] [--limit <n>]

Without assets, lists the pools of the given protocols. With two assets, lists
the pools for that pair. Reserves are raw amounts (smallest unit) as strings.
Needs SOROSWAP_API_KEY.

  --protocols <list>    Comma-separated (default: every AMM protocol the API offers, i.e. all but sdex)
  --asset-list <list>   Only pools whose tokens are in these lists (SOROSWAP, STELLAR_EXPERT, LOBSTR, AQUA)
  --limit <n>           Print at most n pools

Example:
  soroswap pools XLM USDC --protocols soroswap,aqua -f json`,
  options: { protocols: { type: 'string' }, 'asset-list': { type: 'string' }, limit: { type: 'string' } },
  positionals: [0, 2],
  async run(ctx, values, positionals) {
    if (positionals.length === 1) throw new UsageError('Pass two assets for a pair, or none to list pools');
    const limit = optionalInt(values, 'limit', 1);
    const sdk = ctx.sdk();
    const protocols = list(values.protocols) ?? (await sdk.getProtocols(ctx.network)).filter(p => p !== 'sdex');

    let pools;
    if (positionals.length === 2) {
      const [a, b] = await Promise.all(positionals.map(p => ctx.assets.resolve(p)));
      pools = await sdk.getPoolByTokens(a.contract, b.contract, ctx.network, protocols);
    } else {
      pools = await sdk.getPools(ctx.network, protocols, list(values['asset-list']));
    }
    const rows = pools.slice(0, limit ?? pools.length).map(p => ({
      protocol: p.protocol,
      address: p.address,
      tokenA: p.tokenA,
      tokenB: p.tokenB,
      reserveA: String(p.reserveA),
      reserveB: String(p.reserveB),
      ledger: p.ledger ?? null,
    }));
    return { data: rows, human: table(rows, ['protocol', 'address', 'tokenA', 'tokenB', 'reserveA', 'reserveB']) };
  },
};
