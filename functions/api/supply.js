const SOL_MINT = "9SbNtqtnXbSGKvQv6G1XMzmoiEMNHoNWQNtMz7sbpump";
const CACHE_TTL_SEC = 300;
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

let cache = { ts: 0, data: null };

async function fetchSupply() {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenSupply",
    params: [SOL_MINT]
  };
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("rpc");
  const data = await res.json();
  const value = data && data.result && data.result.value ? data.result.value : null;
  if (!value) throw new Error("rpc");
  const decimals = Number(value.decimals || 0);
  const amount = Number(value.amount || 0);
  const totalSupply = amount / (10 ** decimals);
  const supply01pct = totalSupply * 0.001;
  return { totalSupply, supply01pct, decimals };
}

export async function onRequestGet() {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL_SEC * 1000) {
    return new Response(JSON.stringify(cache.data), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${CACHE_TTL_SEC}` }
    });
  }
  try {
    const supply = await fetchSupply();
    const payload = {
      ok: true,
      asOf: new Date().toISOString(),
      totalSupply: supply.totalSupply,
      supply01pct: supply.supply01pct,
      decimals: supply.decimals
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
