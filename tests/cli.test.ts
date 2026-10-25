import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { formatUnits, parseRawAmount, parseUnits } from '../src/cli/amounts';
import { CliDeps } from '../src/cli/context';
import { run } from '../src/cli/run';
import { TradeType } from '../src/types';

const XLM = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';
const USDC = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';
const EIGHTEEN = 'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV';
const SIGNER = Keypair.fromSecret('SD3U7CIYKTM6NP5NZEE4Y4MJGFU2FWUVYLLY7UA7354U7LPHIODBO2BS');

const tokenList = {
  assets: [
    { code: 'USDC', contract: USDC, decimals: 7 },
    { code: 'TEST', contract: EIGHTEEN, decimals: 18 },
  ],
};

function unsignedXdr(): string {
  return new TransactionBuilder(new Account(SIGNER.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.PUBLIC })
    .addOperation(Operation.payment({ destination: SIGNER.publicKey(), asset: Asset.native(), amount: '1' }))
    .setTimeout(0)
    .build()
    .toXDR();
}

const quoteResponse = {
  assetIn: XLM,
  assetOut: USDC,
  amountIn: '10000000',
  amountOut: '3912345',
  otherAmountThreshold: '3892783',
  tradeType: TradeType.EXACT_IN,
  priceImpactPct: '0.01',
  platform: 'aggregator',
  rawTrade: {},
  routePlan: [{ swapInfo: { protocol: 'soroswap', path: [XLM, USDC] }, percent: '100' }],
};

function setup(env: Record<string, string> = { SOROSWAP_API_KEY: 'sk_test' }) {
  const sdk = {
    getProtocols: jest.fn().mockResolvedValue(['soroswap', 'aqua', 'sdex']),
    quote: jest.fn().mockResolvedValue(quoteResponse),
    build: jest.fn().mockResolvedValue({ xdr: unsignedXdr() }),
    send: jest.fn().mockResolvedValue({ txHash: 'abc', success: true, ledger: 7, feeCharged: '100', result: null }),
    getPrice: jest.fn().mockResolvedValue([{ asset: XLM, price: '0.39' }]),
    getBalances: jest.fn().mockResolvedValue({
      wallet: SIGNER.publicKey(),
      network: 'mainnet',
      updatedAt: 0,
      balances: [
        { asset: { code: 'XLM', issuer: null, contract: XLM, decimals: 7 }, rawAmount: '125000000', availableRaw: '115000000' },
        { asset: { code: 'USDC', issuer: 'G', contract: USDC, decimals: 7 }, rawAmount: '0', availableRaw: '0' },
      ],
    }),
    getPools: jest.fn().mockResolvedValue([
      { protocol: 'soroswap', address: 'CPOOL', tokenA: XLM, tokenB: USDC, reserveA: '1', reserveB: '2', ledger: 5 },
    ]),
    getPoolByTokens: jest.fn().mockResolvedValue([]),
  };
  const stdout: string[] = [];
  const stderr: string[] = [];
  const stellar = {
    fetchDecimals: jest.fn().mockResolvedValue(6),
    simulate: jest.fn().mockResolvedValue({ ok: true, minResourceFee: '1234', error: null }),
  };
  const createSdk = jest.fn().mockReturnValue(sdk);
  const deps: CliDeps = {
    env,
    stdout: t => stdout.push(t),
    stderr: t => stderr.push(t),
    createSdk,
    fetchJson: jest.fn().mockResolvedValue(tokenList),
    readStdin: jest.fn().mockResolvedValue(unsignedXdr()),
    stellar,
  };
  const json = () => JSON.parse(stdout.join('\n'));
  return { sdk, deps, stdout, stderr, stellar, createSdk, json };
}

describe('amounts', () => {
  it('converts human units using the asset decimals', () => {
    expect(parseUnits('1.5', 7)).toBe(15000000n);
    expect(parseUnits('.25', 2)).toBe(25n);
    expect(parseUnits('1', 18)).toBe(10n ** 18n);
  });

  it('refuses more decimals than the asset has, instead of rounding', () => {
    expect(() => parseUnits('1.12345678', 7)).toThrow('more than 7 decimal places');
  });

  it('refuses negative, zero, exponent and garbage amounts', () => {
    for (const bad of ['-1', '0', '1e5', 'abc', '']) expect(() => parseUnits(bad, 7)).toThrow();
    expect(() => parseRawAmount('1.5')).toThrow();
  });

  it('formats raw units without trailing zeros', () => {
    expect(formatUnits('15000000', 7)).toBe('1.5');
    expect(formatUnits('10000000', 7)).toBe('1');
    expect(formatUnits('5', 7)).toBe('0.0000005');
  });
});

describe('argument parsing', () => {
  it('rejects --amount together with --raw-amount with exit code 2', async () => {
    const t = setup();
    const code = await run(['quote', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '--raw-amount', '10', '-f', 'json'], t.deps);
    expect(code).toBe(2);
    expect(t.json()).toEqual({ error: '--amount and --raw-amount are mutually exclusive' });
    expect(t.sdk.quote).not.toHaveBeenCalled();
  });

  it('requires one of --amount or --raw-amount', async () => {
    const t = setup();
    expect(await run(['quote', '--from', 'XLM', '--to', 'USDC', '-f', 'json'], t.deps)).toBe(2);
    expect(t.json().error).toMatch(/--amount or --raw-amount/);
  });

  it('reports unknown flags and commands as JSON errors on stdout', async () => {
    const t = setup();
    expect(await run(['quote', '--frm', 'XLM', '--output', 'json'], t.deps)).toBe(2);
    expect(t.json().error).toMatch(/Unknown option '--frm'/);

    const u = setup();
    expect(await run(['--format', 'json', 'nope'], u.deps)).toBe(2);
    expect(u.json().error).toMatch(/Unknown command "nope"/);
  });

  it('prints errors to stderr in table mode', async () => {
    const t = setup();
    expect(await run(['quote', '--from', 'XLM', '--to', 'USDC'], t.deps)).toBe(2);
    expect(t.stdout).toEqual([]);
    expect(t.stderr[0]).toMatch(/^Error: /);
  });

  it('validates --network and --format', async () => {
    const t = setup();
    expect(await run(['price', 'XLM', '--network', 'futurenet', '-f', 'json'], t.deps)).toBe(2);
    expect(t.json().error).toMatch(/--network must be/);
    const u = setup();
    expect(await run(['price', 'XLM', '-f', 'yaml'], u.deps)).toBe(2);
  });

  it('asks for the API key only when a command needs it', async () => {
    const t = setup({});
    expect(await run(['price', 'XLM', '-f', 'json'], t.deps)).toBe(1);
    expect(t.json().error).toMatch(/SOROSWAP_API_KEY is not set/);
    const u = setup({});
    expect(await run(['--help'], u.deps)).toBe(0);
  });

  it('turns raw API error bodies into messages', async () => {
    const t = setup();
    t.sdk.getPrice.mockRejectedValue({ statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' });
    expect(await run(['price', 'XLM', '-f', 'json'], t.deps)).toBe(1);
    expect(t.json().error).toMatch(/^API error 403: Forbidden resource/);
  });
});

describe('quote', () => {
  it('resolves symbols and decimals, sends raw units and prints a stable JSON shape', async () => {
    const t = setup();
    const code = await run(['quote', '--from', 'XLM', '--to', 'usdc', '--amount', '1', '--slippage-bps', '100', '-f', 'json'], t.deps);
    expect(code).toBe(0);
    expect(t.sdk.quote).toHaveBeenCalledWith(
      expect.objectContaining({
        assetIn: XLM,
        assetOut: USDC,
        amount: 10000000n,
        tradeType: 'EXACT_IN',
        protocols: ['soroswap', 'aqua', 'sdex'],
        slippageBps: 100,
      }),
      'mainnet',
    );
    expect(t.json()).toEqual({
      network: 'mainnet',
      tradeType: 'EXACT_IN',
      platform: 'aggregator',
      assetIn: { contract: XLM, code: 'XLM', decimals: 7 },
      assetOut: { contract: USDC, code: 'USDC', decimals: 7 },
      amountIn: '1',
      amountInRaw: '10000000',
      amountOut: '0.3912345',
      amountOutRaw: '3912345',
      otherAmountThreshold: '0.3892783',
      otherAmountThresholdRaw: '3892783',
      slippageBps: 100,
      priceImpactPct: 0.01,
      route: [{ protocol: 'soroswap', path: [XLM, USDC], percent: 100 }],
    });
  });

  it('uses the output asset decimals for --exact-out', async () => {
    const t = setup();
    await run(['quote', '--from', 'XLM', '--to', EIGHTEEN, '--amount', '2', '--exact-out', '-f', 'json'], t.deps);
    expect(t.sdk.quote.mock.calls[0][0]).toMatchObject({ amount: 2n * 10n ** 18n, tradeType: 'EXACT_OUT' });
  });

  it('reads decimals on chain for contracts outside the token list', async () => {
    const t = setup();
    const unknown = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    await run(['quote', '--from', unknown, '--to', 'USDC', '--amount', '1', '-f', 'json'], t.deps);
    expect(t.stellar.fetchDecimals).toHaveBeenCalledWith(unknown, 'mainnet');
    expect(t.sdk.quote.mock.calls[0][0].amount).toBe(1000000n);
  });

  it('passes --raw-amount through untouched and honours --protocols', async () => {
    const t = setup();
    await run(['quote', '--from', 'XLM', '--to', 'USDC', '--raw-amount', '123', '--protocols', 'soroswap', '-f', 'json'], t.deps);
    expect(t.sdk.getProtocols).not.toHaveBeenCalled();
    expect(t.sdk.quote.mock.calls[0][0]).toMatchObject({ amount: 123n, protocols: ['soroswap'] });
  });
});

describe('swap', () => {
  it('--dry-run builds for --address, simulates, and never signs or sends', async () => {
    const t = setup();
    const code = await run(
      ['swap', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '--dry-run', '--address', SIGNER.publicKey(), '-f', 'json'],
      t.deps,
    );
    expect(code).toBe(0);
    expect(t.sdk.build).toHaveBeenCalledWith(
      { quote: quoteResponse, from: SIGNER.publicKey(), to: SIGNER.publicKey() },
      'mainnet',
    );
    expect(t.sdk.send).not.toHaveBeenCalled();
    const out = t.json();
    expect(out).toMatchObject({ dryRun: true, address: SIGNER.publicKey(), simulation: { ok: true } });
    expect(out.xdr).toBe(unsignedXdr());
    expect(out.quote.amountOut).toBe('0.3912345');
  });

  it('--dry-run exits non-zero when the simulation fails, but still prints the XDR', async () => {
    const t = setup();
    t.stellar.simulate.mockResolvedValue({ ok: false, minResourceFee: null, error: 'HostError' });
    const code = await run(['swap', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '--dry-run', '--address', SIGNER.publicKey(), '-f', 'json'], t.deps);
    expect(code).toBe(1);
    expect(t.json().xdr).toBeDefined();
  });

  it('--dry-run without --address or a signer is a usage error', async () => {
    const t = setup();
    expect(await run(['swap', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '--dry-run', '-f', 'json'], t.deps)).toBe(2);
  });

  it('a real swap needs a signer', async () => {
    const t = setup();
    expect(await run(['swap', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '-f', 'json'], t.deps)).toBe(1);
    expect(t.json().error).toMatch(/STELLAR_SECRET_KEY/);
    expect(t.sdk.quote).not.toHaveBeenCalled();
  });

  it('signs with STELLAR_SECRET_KEY and submits', async () => {
    const t = setup({ SOROSWAP_API_KEY: 'sk_test', STELLAR_SECRET_KEY: SIGNER.secret() });
    const code = await run(['swap', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '-f', 'json'], t.deps);
    expect(code).toBe(0);
    const signed = TransactionBuilder.fromXDR(t.sdk.send.mock.calls[0][0], Networks.PUBLIC);
    expect(signed.signatures).toHaveLength(1);
    expect(t.json()).toMatchObject({ dryRun: false, txHash: 'abc', success: true, ledger: 7 });
  });

  it('rejects an unknown STELLAR_SIGNER backend', async () => {
    const t = setup({ SOROSWAP_API_KEY: 'sk_test', STELLAR_SIGNER: 'privy' });
    expect(await run(['swap', '--from', 'XLM', '--to', 'USDC', '--amount', '1', '-f', 'json'], t.deps)).toBe(1);
    expect(t.json().error).toMatch(/Unsupported STELLAR_SIGNER "privy"/);
  });
});

describe('sign', () => {
  it('signs an XDR from stdin with the network passphrase and does not submit', async () => {
    const t = setup({ STELLAR_SECRET_KEY: SIGNER.secret() });
    expect(await run(['sign', '--xdr', '-', '-f', 'json'], t.deps)).toBe(0);
    const out = t.json();
    expect(out.signer).toBe(SIGNER.publicKey());
    const tx = TransactionBuilder.fromXDR(out.signedXdr, Networks.PUBLIC);
    expect(SIGNER.verify(tx.hash(), tx.signatures[0].signature())).toBe(true);
    expect(out.hash).toBe(Buffer.from(tx.hash()).toString('hex'));
    expect(t.createSdk).not.toHaveBeenCalled();
  });

  it('--submit sends through the API', async () => {
    const t = setup({ SOROSWAP_API_KEY: 'sk_test', STELLAR_SECRET_KEY: SIGNER.secret() });
    expect(await run(['sign', '--xdr', unsignedXdr(), '--submit', '-f', 'json'], t.deps)).toBe(0);
    expect(t.sdk.send).toHaveBeenCalledWith(expect.any(String), 'mainnet');
    expect(t.json()).toMatchObject({ txHash: 'abc', success: true });
  });

  it('rejects an invalid XDR', async () => {
    const t = setup({ STELLAR_SECRET_KEY: SIGNER.secret() });
    expect(await run(['sign', '--xdr', 'not-xdr', '-f', 'json'], t.deps)).toBe(1);
    expect(t.json().error).toMatch(/Invalid transaction XDR/);
  });
});

describe('price, balances, pools', () => {
  it('price returns priceUsd as a number, or null when unknown', async () => {
    const t = setup();
    await run(['price', 'XLM', 'USDC', '-f', 'json'], t.deps);
    expect(t.json()).toEqual([
      { asset: XLM, code: 'XLM', priceUsd: 0.39 },
      { asset: USDC, code: 'USDC', priceUsd: null },
    ]);
  });

  it('balances hides zero balances unless --include-zero, defaulting to the signer address', async () => {
    const t = setup({ SOROSWAP_API_KEY: 'sk_test', STELLAR_SECRET_KEY: SIGNER.secret() });
    await run(['balances', '-f', 'json'], t.deps);
    expect(t.sdk.getBalances).toHaveBeenCalledWith(SIGNER.publicKey(), 'mainnet');
    expect(t.json().balances).toEqual([
      {
        code: 'XLM',
        contract: XLM,
        issuer: null,
        decimals: 7,
        amount: '12.5',
        amountRaw: '125000000',
        available: '11.5',
        availableRaw: '115000000',
      },
    ]);
    const u = setup();
    await run(['balances', SIGNER.publicKey(), '--include-zero', '-f', 'json', '--network', 'testnet'], u.deps);
    expect(u.sdk.getBalances).toHaveBeenCalledWith(SIGNER.publicKey(), 'testnet');
    expect(u.json().balances).toHaveLength(2);
  });

  it('pools defaults to every protocol but sdex, and resolves a pair', async () => {
    const t = setup();
    await run(['pools', '-f', 'json'], t.deps);
    expect(t.sdk.getPools).toHaveBeenCalledWith('mainnet', ['soroswap', 'aqua'], undefined);
    expect(t.json()[0]).toEqual({
      protocol: 'soroswap', address: 'CPOOL', tokenA: XLM, tokenB: USDC, reserveA: '1', reserveB: '2', ledger: 5,
    });
    const u = setup();
    await run(['pools', 'XLM', 'USDC', '--protocols', 'aqua', '-f', 'json'], u.deps);
    expect(u.sdk.getPoolByTokens).toHaveBeenCalledWith(XLM, USDC, 'mainnet', ['aqua']);
  });

  it('table output renders a header row', async () => {
    const t = setup();
    await run(['pools'], t.deps);
    expect(t.stdout[0].split('\n')[0]).toMatch(/^protocol\s+address\s+tokenA/);
  });
});
