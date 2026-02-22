const SOL_MINT = "9SbNtqtnXbSGKvQv6G1XMzmoiEMNHoNWQNtMz7sbpump";
const CACHE_TTL_SEC = 60;
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
  if (!res.ok) throw new Error(`rpc:${res.status}`);
  const data = await res.json();
  const value = data && data.result && data.result.value ? data.result.value : null;
  if (!value) throw new Error("rpc:missing_value");
  const decimals = Number(value.decimals || 0);
  const uiAmountString = value.uiAmountString || value.uiAmount || null;

  function formatFromBigInt(bigValue, decimalPlaces) {
    const isNegative = bigValue < 0n;
    const raw = (isNegative ? -bigValue : bigValue).toString();
    if (decimalPlaces === 0) return (isNegative ? "-" : "") + raw;
    const padded = raw.padStart(decimalPlaces + 1, "0");
    const intPart = padded.slice(0, -decimalPlaces);
    const fracPart = padded.slice(-decimalPlaces).replace(/0+$/, "") || "0";
    return `${isNegative ? "-" : ""}${intPart}.${fracPart}`;
  }

  function decimalToBigInt(decimalStr) {
    const cleaned = String(decimalStr).replace(/,/g, "");
    const [intPart, fracPart = ""] = cleaned.split(".");
    const digits = `${intPart}${fracPart}`.replace(/^0+(?=\d)/, "") || "0";
    return { big: BigInt(digits), decimals: fracPart.length };
  }

  let amountBig = null;
  if (value.amount) {
    amountBig = BigInt(String(value.amount));
  }

  let totalSupplyStr = null;
  let supply01pctStr = null;

  if (amountBig !== null) {
    totalSupplyStr = uiAmountString ? String(uiAmountString) : formatFromBigInt(amountBig, decimals);
    supply01pctStr = formatFromBigInt(amountBig, decimals + 3);
  } else if (uiAmountString) {
    const parsed = decimalToBigInt(uiAmountString);
    totalSupplyStr = String(uiAmountString);
    supply01pctStr = formatFromBigInt(parsed.big, parsed.decimals + 3);
  } else {
    throw new Error("rpc:no_amount");
  }

  const totalSupply = Number(totalSupplyStr);
  const supply01pct = Number(supply01pctStr);
  return { totalSupply, totalSupplyStr, supply01pct, supply01pctStr, decimals };
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
      totalSupplyStr: supply.totalSupplyStr,
      supply01pct: supply.supply01pct,
      supply01pctStr: supply.supply01pctStr,
      decimals: supply.decimals
    };
    cache = { ts: now, data: payload };
    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${CACHE_TTL_SEC}` }
    });
  } catch (err) {
    const message = err && err.message ? err.message : "supply_error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
