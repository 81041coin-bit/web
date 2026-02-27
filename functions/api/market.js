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
  const priceUsd = best.priceUsd ? Number(best.priceUsd) : null;
  return { trades24h, liquidityUsd, marketCapUsd, marketCapType, priceUsd };
}

async function fetchHolders(apiKey) {
  if (!apiKey) return null;
  const headers = { "X-API-KEY": apiKey };
  const parseHolder = (data) => {
    const bag = data && data.data ? data.data : data;
    const value = bag
      ? (bag.holder ??
         bag.holders ??
         bag.holderCount ??
         bag.holdersCount ??
         bag.holder_count ??
         bag.holders_count ??
         bag.holder_number ??
         bag.holders_number)
      : null;
    if (value === null || value === undefined) return null;
    const num = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : null;
  };
  const overviewUrl = `https://public-api.birdeye.so/defi/token_overview?address=${SOL_MINT}`;
  const overviewRes = await fetch(overviewUrl, { headers });
  if (overviewRes.ok) {
    const overviewData = await overviewRes.json();
    const overviewValue = parseHolder(overviewData);
    if (overviewValue !== null) return overviewValue;
  }
  const securityUrl = `https://public-api.birdeye.so/defi/token_security?address=${SOL_MINT}`;
  const securityRes = await fetch(securityUrl, { headers });
  if (!securityRes.ok) return null;
  const securityData = await securityRes.json();
  return parseHolder(securityData);
}

async function fetchDistributionPool(rpcUrl) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [DISTRIBUTION_WALLET, { mint: SOL_MINT }, { encoding: "jsonParsed" }]
  };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) return { amount: null };
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
    const rpcUrl = env && env.SOLANA_RPC ? env.SOLANA_RPC : SOLANA_RPC;
    const [dex, holders, pool] = await Promise.all([
      fetchDexScreener(),
      fetchHolders(apiKey),
      fetchDistributionPool(rpcUrl)
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
      distributionPool: {
        amount: pool && pool.amount !== undefined ? pool.amount : null,
        amountUsd: (pool && pool.amount !== null && pool.amount !== undefined && dex && dex.priceUsd)
          ? pool.amount * dex.priceUsd
          : null,
        updatedAt: new Date().toISOString()
      }
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
