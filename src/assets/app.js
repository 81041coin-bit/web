const MARKET_INTERVAL_SEC = 30;
const SUPPLY_INTERVAL_MS = 300000;

let currentLang = "en";
let I18N = {};

// TODO: If a key is missing in i18n JSON, show a visible placeholder.
function missingKey(key) {
  return `[MISSING:${key}]`;
}

function template(str, vars) {
  let out = str;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  });
  return out;
}

function formatNumber(value, maxDecimals = 6) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

function applyI18n() {
  document.documentElement.setAttribute("lang", currentLang);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = I18N[key];
    if (value === undefined) {
      el.textContent = missingKey(key);
      return;
    }
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
  });
}

function renderMermaid() {
  if (!window.mermaid) return;
  try {
    window.mermaid.initialize({ startOnLoad: false });
    window.mermaid.run({ querySelector: ".mermaid" });
  } catch (_) {}
}

async function loadI18n(lang) {
  const res = await fetch(`/assets/i18n/${lang}.json`);
  if (!res.ok) throw new Error("i18n");
  I18N = await res.json();
}

async function detectLang() {
  const stored = localStorage.getItem("lang");
  if (stored) {
    currentLang = stored;
    try {
      await loadI18n(currentLang);
      applyI18n();
      renderMermaid();
      return;
    } catch (_) {}
  }
  try {
    const res = await fetch("/api/geo");
    if (!res.ok) throw new Error("geo");
    const data = await res.json();
    const lang = data && data.lang ? data.lang : "en";
    currentLang = lang;
    localStorage.setItem("lang", lang);
  } catch (_) {
    currentLang = "en";
  }
  await loadI18n(currentLang);
  applyI18n();
  renderMermaid();
}

function bindLangSwitch() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.getAttribute("data-lang");
      if (!lang) return;
      currentLang = lang;
      localStorage.setItem("lang", lang);
      await loadI18n(currentLang);
      applyI18n();
      renderMermaid();
      if (document.getElementById("market-section")) {
        fetchMarket();
      }
      if (document.getElementById("supply-section")) {
        fetchSupply();
      }
    });
  });
}

function setText(id, value, fallbackKey) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value === null || value === undefined) {
    el.textContent = I18N[fallbackKey] || missingKey(fallbackKey);
    return;
  }
  el.textContent = value;
}

async function fetchMarket() {
  const statusEl = document.getElementById("market-status");
  if (statusEl) statusEl.textContent = I18N["market.loading"] || missingKey("market.loading");
  try {
    const res = await fetch("/api/market");
    if (!res.ok) throw new Error("market");
    const data = await res.json();
    if (!data || !data.ok) throw new Error("market");

    const holders = data.market && data.market.holders;
    const trades = data.market && data.market.trades24h;
    const liquidity = data.market && data.market.liquidityUsd;
    const mcap = data.market && data.market.marketCapUsd;

    setText("market-holders", holders !== null ? formatNumber(holders, 0) : null, "market.na");
    setText("market-trades", trades !== null ? formatNumber(trades, 0) : null, "market.na");
    setText("market-liquidity", liquidity !== null ? `$${formatNumber(liquidity, 2)}` : null, "market.na");
    setText("market-cap", mcap !== null ? `$${formatNumber(mcap, 2)}` : null, "market.na");

    const updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    const updatedText = updatedAt ? updatedAt.toLocaleString() : (I18N["market.na"] || missingKey("market.na"));
    const updatedTemplate = I18N["market.updated"] || missingKey("market.updated");
    const updatedEl = document.getElementById("market-updated");
    if (updatedEl) updatedEl.textContent = template(updatedTemplate, { TIME: updatedText });

    const noteEl = document.getElementById("market-note");
    if (noteEl) {
      const noteTemplate = I18N["market.note"] || missingKey("market.note");
      const note = template(noteTemplate, {
        SOURCE: data.source || "DexScreener",
        INTERVAL: String(data.intervalSec || MARKET_INTERVAL_SEC),
        TYPE: data.marketCapType || "FDV",
      });
      noteEl.textContent = note;
    }

    if (statusEl) statusEl.textContent = "";

    if (data.distributionPool) {
      const amount = data.distributionPool.amount;
      const updated = data.distributionPool.updatedAt
        ? new Date(data.distributionPool.updatedAt).toLocaleString()
        : (I18N["market.na"] || missingKey("market.na"));
      const poolAmountEl = document.getElementById("pool-amount");
      const poolUpdatedEl = document.getElementById("pool-updated");
      if (poolAmountEl) {
        const text = template(I18N["pool.amount"] || missingKey("pool.amount"), {
          AMOUNT: amount !== null ? formatNumber(amount, 6) : (I18N["market.na"] || missingKey("market.na")),
        });
        poolAmountEl.textContent = text;
      }
      if (poolUpdatedEl) {
        const text = template(I18N["pool.updated"] || missingKey("pool.updated"), {
          UPDATED: updated,
        });
        poolUpdatedEl.textContent = text;
      }
    }
  } catch (_) {
    if (statusEl) statusEl.textContent = I18N["market.unavailable"] || missingKey("market.unavailable");
    setText("market-holders", null, "market.na");
    setText("market-trades", null, "market.na");
    setText("market-liquidity", null, "market.na");
    setText("market-cap", null, "market.na");
  }
}

async function fetchSupply() {
  const statusEl = document.getElementById("supply-status");
  if (statusEl) statusEl.textContent = I18N["distribution.table.loading"] || missingKey("distribution.table.loading");
  try {
    const res = await fetch("/api/supply");
    if (!res.ok) throw new Error("supply");
    const data = await res.json();
    if (!data || !data.ok) throw new Error("supply");

    const totalEl = document.getElementById("supply-total");
    const pctEl = document.getElementById("supply-01");
    const updatedEl = document.getElementById("supply-updated");

    if (totalEl) totalEl.textContent = formatNumber(data.totalSupply, 6);
    if (pctEl) pctEl.textContent = formatNumber(data.supply01pct, 6);
    if (updatedEl) updatedEl.textContent = new Date(data.asOf).toLocaleString();

    if (statusEl) statusEl.textContent = "";
  } catch (_) {
    if (statusEl) statusEl.textContent = I18N["distribution.table.error"] || missingKey("distribution.table.error");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await detectLang();
  bindLangSwitch();

  if (document.getElementById("market-section")) {
    fetchMarket();
    setInterval(fetchMarket, MARKET_INTERVAL_SEC * 1000);
  }

  if (document.getElementById("supply-section")) {
    fetchSupply();
    setInterval(fetchSupply, SUPPLY_INTERVAL_MS);
  }
});
