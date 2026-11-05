import { QuoteResponse, SupportedProtocols, TradeType } from '../../types';
import { formatUnits } from '../amounts';
import { ResolvedAsset } from '../assets';
import { checkAmountFlags, CliContext, list, optionalInt, readAmount, requireString, Values } from '../context';
import { UsageError } from '../errors';
import { keyValues } from '../output';
import { Command, OptionSpec } from './command';

export const QUOTE_OPTIONS: Record<string, OptionSpec> = {
  from: { type: 'string' },
  to: { type: 'string' },
  amount: { type: 'string' },
  'raw-amount': { type: 'string' },
  'exact-out': { type: 'boolean' },
  'slippage-bps': { type: 'string' },
  protocols: { type: 'string' },
  'max-hops': { type: 'string' },
  parts: { type: 'string' },
};

export const QUOTE_FLAGS_HELP = `  --from <asset>          Asset to sell: contract id (C...), XLM, CODE:ISSUER, or a token-list symbol
  --to <asset>            Asset to buy, same forms as --from
  --amount <n>            Amount in human units (decimals come from the asset)
  --raw-amount <n>        Amount in the asset's smallest unit; exclusive with --amount
  --exact-out             The amount is what you receive (EXACT_OUT); default is what you sell
  --slippage-bps <n>      Slippage tolerance in basis points (default 50)
  --protocols <list>      Comma-separated protocols (default: all the API offers on the network)
  --max-hops <n>          Maximum hops per route
  --parts <n>             Route splits for the aggregator`;

export interface QuoteRun {
  quote: QuoteResponse;
  assetIn: ResolvedAsset;
  assetOut: ResolvedAsset;
  slippageBps: number;
}

/** Shared by `quote` and `swap`: resolve assets and amount, then ask the API. */
export async function runQuote(ctx: CliContext, values: Values): Promise<QuoteRun> {
  const from = requireString(values, 'from');
  const to = requireString(values, 'to');
  checkAmountFlags(values);
  const slippageBps = optionalInt(values, 'slippage-bps', 0, 10000) ?? 50;
  const maxHops = optionalInt(values, 'max-hops', 1, 10);
  const parts = optionalInt(values, 'parts', 1, 1000);
  const exactOut = values['exact-out'] === true;
  const usesHumanAmount = values.amount !== undefined;

  const [assetIn, assetOut] = await Promise.all([
    ctx.assets.resolve(from, true),
    ctx.assets.resolve(to, true),
  ]);
  if (assetIn.contract === assetOut.contract) throw new UsageError('--from and --to are the same asset');

  const amount = readAmount(values, usesHumanAmount ? (exactOut ? assetOut : assetIn).decimals : null);
  const sdk = ctx.sdk();
  const protocols = (list(values.protocols) ?? (await sdk.getProtocols(ctx.network))) as SupportedProtocols[];

  const quote = await sdk.quote(
    {
      assetIn: assetIn.contract,
      assetOut: assetOut.contract,
      amount,
      tradeType: exactOut ? TradeType.EXACT_OUT : TradeType.EXACT_IN,
      protocols,
      slippageBps,
      ...(maxHops !== undefined && { maxHops }),
      ...(parts !== undefined && { parts }),
    },
    ctx.network,
  );
  return { quote, assetIn, assetOut, slippageBps };
}

const human = (raw: unknown, asset: ResolvedAsset) =>
  raw === undefined || raw === null || asset.decimals === null ? null : formatUnits(String(raw), asset.decimals);

const toNumberOrNull = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));

/** The stable JSON shape of a quote. Amounts are strings: human units plus `*Raw` smallest units. */
export function summarizeQuote(network: string, run: QuoteRun) {
  const { quote, assetIn, assetOut, slippageBps } = run;
  const thresholdAsset = quote.tradeType === TradeType.EXACT_IN ? assetOut : assetIn;
  return {
    network,
    tradeType: quote.tradeType,
    platform: quote.platform,
    assetIn,
    assetOut,
    amountIn: human(quote.amountIn, assetIn),
    amountInRaw: String(quote.amountIn),
    amountOut: human(quote.amountOut, assetOut),
    amountOutRaw: String(quote.amountOut),
    /** Minimum received (EXACT_IN) or maximum sold (EXACT_OUT) after slippage. */
    otherAmountThreshold: human(quote.otherAmountThreshold, thresholdAsset),
    otherAmountThresholdRaw: String(quote.otherAmountThreshold),
    slippageBps,
    priceImpactPct: toNumberOrNull(quote.priceImpactPct),
    route: (quote.routePlan ?? []).map(r => ({
      protocol: r.swapInfo.protocol,
      path: r.swapInfo.path,
      percent: toNumberOrNull(r.percent),
    })),
  };
}

export function renderQuote(summary: ReturnType<typeof summarizeQuote>): string {
  const label = (a: ResolvedAsset) => a.code ?? a.contract;
  const minLabel = summary.tradeType === TradeType.EXACT_IN ? 'minimumReceived' : 'maximumSold';
  return keyValues({
    network: summary.network,
    tradeType: summary.tradeType,
    platform: summary.platform,
    sell: `${summary.amountIn} ${label(summary.assetIn)}`,
    buy: `${summary.amountOut} ${label(summary.assetOut)}`,
    [minLabel]: `${summary.otherAmountThreshold} ${label(summary.tradeType === TradeType.EXACT_IN ? summary.assetOut : summary.assetIn)}`,
    priceImpactPct: summary.priceImpactPct,
    route: summary.route.map(r => `${r.protocol} ${r.percent ?? '?'}%`).join(', '),
  });
}

export const quoteCommand: Command = {
  name: 'quote',
  summary: 'Get the best route and price for a swap',
  help: `Usage: soroswap quote --from <asset> --to <asset> (--amount <n> | --raw-amount <n>) [options]

Asks the Soroswap API for the best route. Read-only; needs SOROSWAP_API_KEY.

${QUOTE_FLAGS_HELP}

Example:
  soroswap quote --from XLM --to USDC --amount 100 -f json`,
  options: QUOTE_OPTIONS,
  positionals: [0, 0],
  async run(ctx, values) {
    const summary = summarizeQuote(ctx.network, await runQuote(ctx, values));
    return { data: summary, human: renderQuote(summary) };
  },
};
