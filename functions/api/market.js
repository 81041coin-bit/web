const SOL_MINT = "9SbNtqtnXbSGKvQv6G1XMzmoiEMNHoNWQNtMz7sbpump";
const CACHE_TTL_SEC = 30;
const DISTRIBUTION_WALLET = "ArMsjD9ELKiZNP1sbYNYdcAGzGHxiYDs9XReBSKzcvfB";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

let cache = { ts: 0, data: null };

async function fetchDexScreener() {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${SOL_MINT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("dex");
  const data = await res.json();
  const pairs = data && data.pairs ? data.pairs : [];
  if (!pairs.length) return null;
  const best = pairs
    .filter((p) => p.chainId === "solana")
    .sort((a, b) => (b.liquidity && b.liquidity.usd ? b.liquidity.usd : 0) - (a.liquidity && a.liquidity.usd ? a.liquidity.usd : 0))[0];
  if (!best) return null;
  const trades24h = best.txns && best.txns.h24 ? (best.txns.h24.buys || 0) + (best.txns.h24.sells || 0) : null;
  const liquidityUsd = best.liquidity ? best.liquidity.usd : null;
  const marketCapUsd = best.marketCap || best.fdv || null;
  const marketCapType = best.marketCap ? "Market Cap" : "FDV";
  return { trades24h, liquidityUsd, marketCapUsd, marketCapType };
}

async function fetchHolders(apiKey) {
  if (!apiKey) return null;
  const url = `https://public-api.birdeye.so/defi/token_overview?address=${SOL_MINT}`;
  const res = await fetch(url, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) return null;
  const data = await res.json();
  return data && data.data ? data.data.holder : null;
}

async function fetchDistributionPool() {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [DISTRIBUTION_WALLET, { mint: SOL_MINT }, { encoding: "jsonParsed" }]
  };
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) return null;
  const data = await res.json();
  const accounts = data && data.result && data.result.value ? data.result.value : [];
  if (!accounts.length) return { amount: 0 };
  const info = accounts[0].account.data.parsed.info.tokenAmount;
  const amount = Number(info.uiAmountString || info.uiAmount || 0);
  return { amount };
}

export async function onRequestGet({ env }) {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL_SEC * 1000) {
    return new Response(JSON.stringify(cache.data), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${CACHE_TTL_SEC}` }
    });
  }
  try {
    const apiKey = env && env.BIRDEYE_API_KEY ? env.BIRDEYE_API_KEY : null;
    const [dex, holders, pool] = await Promise.all([
      fetchDexScreener(),
      fetchHolders(apiKey),
      fetchDistributionPool()
    ]);

    const payload = {
      ok: true,
      source: "DexScreener",
      updatedAt: new Date().toISOString(),
      intervalSec: CACHE_TTL_SEC,
      marketCapType: dex ? dex.marketCapType : "FDV",
      market: {
        holders: holders !== null ? holders : null,
        trades24h: dex ? dex.trades24h : null,
        liquidityUsd: dex ? dex.liquidityUsd : null,
        marketCapUsd: dex ? dex.marketCapUsd : null
      },
      distributionPool: pool ? { amount: pool.amount, updatedAt: new Date().toISOString() } : null
    };

    cache = { ts: now, data: payload };

    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${CACHE_TTL_SEC}` }
    });
  } catch (_) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
