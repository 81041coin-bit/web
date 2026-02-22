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

function startPrologue() {
  const prologue = document.querySelector(".prologue-cinematic");
  if (!prologue) return;
  prologue.classList.remove("prologue-start");
  // Restart animation on language change
  void prologue.offsetWidth;
  prologue.classList.add("prologue-start");
}

function startIntroSequence() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  const lines = Array.from(intro.querySelectorAll(".intro-line"));
  if (!lines.length) return;

  document.documentElement.classList.add("intro-active");
  let index = 0;
  const hideDelayMs = 1200;
  const stepMs = 3200;
  let timerId = null;
  let cancelled = false;
  const skipBtn = intro.querySelector(".intro-skip");

  function finishIntro() {
    intro.classList.add("hidden");
    if (timerId) clearTimeout(timerId);
    setTimeout(() => {
      intro.remove();
      document.documentElement.classList.remove("intro-active");
      document.documentElement.classList.add("intro-done");
      const vision = document.getElementById("vision");
      if (vision) {
        vision.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, hideDelayMs);
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      cancelled = true;
      finishIntro();
    });
  }

  function showNext() {
    if (cancelled) return;
    lines.forEach((line) => line.classList.remove("active"));
    const current = lines[index];
    if (current) {
      current.classList.add("active");
      if (current.classList.contains("intro-reveal")) {
        intro.classList.add("reveal");
      }
    }
    index += 1;

    if (index < lines.length) {
      const lineNumber = index; // 1-based of the next line to show
      const fastRange = lineNumber >= 2 && lineNumber <= 4;
      const delay = fastRange ? 2200 : stepMs;
      timerId = setTimeout(showNext, delay);
    } else {
      timerId = setTimeout(() => {
        finishIntro();
      }, stepMs);
    }
  }

  showNext();
}

function buildTradeSteps() {
  const source = document.getElementById("trade-body-source");
  const stepsEl = document.getElementById("trade-steps");
  const introEl = document.getElementById("trade-intro");
  if (!source || !stepsEl || !introEl) return;

  const html = source.innerHTML || source.textContent || "";
  const lines = html.split("<br>");
  const stepRegex = /(STEP\\s*\\d+|【STEP\\s*\\d+】|STEP\\s*\\d+：|STEP\\s*\\d+\\s*：|STEP\\s*\\d+\\s*\\-|STEP\\s*\\d+\\s*：)/i;

  let current = null;
  const steps = [];
  const intro = [];

  lines.forEach((line) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    if (stepRegex.test(cleaned)) {
      current = { title: cleaned.replace(/━+/g, "").trim(), body: [] };
      steps.push(current);
    } else if (current) {
      current.body.push(cleaned);
    } else {
      intro.push(cleaned);
    }
  });

  introEl.innerHTML = `<div class="step-body">${intro.join("<br>") || html}</div>`;
  stepsEl.innerHTML = steps.length ? steps.map((step) => {
    const stepMatch = step.title.match(/STEP\\s*(\\d+)/i);
    const stepNum = stepMatch ? stepMatch[1] : null;
    const imageMap = {
      "3": ["/assets/img/step3.jpeg"],
      "4": ["/assets/img/step4.jpeg", "/assets/img/step4-2.jpeg"],
      "5": ["/assets/img/step5.jpeg"],
      "7": ["/assets/img/step7-1.jpeg", "/assets/img/step7-2.jpeg"],
      "8": ["/assets/img/step8-1.jpeg"],
      "9": ["/assets/img/step9-1.jpeg"]
    };
    const images = stepNum && imageMap[stepNum] ? imageMap[stepNum] : [];
    const imagesHtml = images.length
      ? `<div class="trade-step-images">${images.map((src) => `<img src="${src}" alt="${step.title}">`).join("")}</div>`
      : "";
    return `<div class="trade-step"><h3>${step.title}</h3><div class="step-body">${step.body.join("<br>")}</div>${imagesHtml}</div>`;
  }).join("") : "";
}

function buildDistributionSections() {
  const source = document.getElementById("distribution-body-source");
  const container = document.getElementById("distribution-content");
  if (!source || !container) return;
  const html = source.innerHTML || source.textContent || "";
  const lines = html.split("<br>");
  const sectionRegex = /^([0-9０-９]+)[\\.．]/;

  const sections = [];
  let current = null;
  const intro = [];

  lines.forEach((line) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    if (sectionRegex.test(cleaned)) {
      current = { title: cleaned, body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(cleaned);
    } else {
      intro.push(cleaned);
    }
  });

  const cards = [];
  if (intro.length) {
    cards.push(`<div class="content-card"><div class="card-body">${intro.join("<br>")}</div></div>`);
  }
  sections.forEach((section) => {
    cards.push(
      `<div class="content-card"><h3>${section.title}</h3><div class="card-body">${section.body.join("<br>")}</div></div>`
    );
  });
  container.innerHTML = cards.length
    ? cards.join("")
    : `<div class="content-card"><div class="card-body">${html}</div></div>`;
}

function buildResultsCards() {
  const source = document.getElementById("results-body-source");
  const container = document.getElementById("results-content");
  if (!source || !container) return;
  const html = source.innerHTML || source.textContent || "";
  const lines = html.split("<br>");
  const intro = [];
  const archive = [];
  let inArchive = false;
  lines.forEach((line) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    if (cleaned.includes("アーカイブ") || cleaned.includes("Archive")) {
      inArchive = true;
    }
    (inArchive ? archive : intro).push(cleaned);
  });

  const cards = [];
  if (intro.length) {
    cards.push(`<div class="content-card"><div class="card-body">${intro.join("<br>")}</div></div>`);
  }
  if (archive.length) {
    cards.push(`<div class="content-card"><div class="card-body">${archive.join("<br>")}</div></div>`);
  }
  container.innerHTML = cards.length
    ? cards.join("")
    : `<div class="content-card"><div class="card-body">${html}</div></div>`;
}

function buildFaqAccordion() {
  const source = document.getElementById("faq-body-source");
  const container = document.getElementById("faq-content");
  if (!source || !container) return;
  const html = source.innerHTML || source.textContent || "";
  const lines = html.split("<br>");
  const qRegex = /^(\\d+\\.|Q\\d+|Q\\d+\\.|Q\\d+：|Q\\d+\\s)/i;
  const items = [];
  let current = null;
  lines.forEach((line) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    if (qRegex.test(cleaned)) {
      current = { q: cleaned, a: [] };
      items.push(current);
    } else if (current) {
      current.a.push(cleaned);
    }
  });
  container.innerHTML = items.length
    ? items.map((item) => (
      `<details><summary>${item.q}</summary><div class="answer">${item.a.join("<br>")}</div></details>`
    )).join("")
    : `<div class="content-card"><div class="card-body">${html}</div></div>`;
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
      startPrologue();
      startIntroSequence();
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
  startPrologue();
  startIntroSequence();
  buildTradeSteps();
  buildDistributionSections();
  buildResultsCards();
  buildFaqAccordion();
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
      startPrologue();
      startIntroSequence();
      buildTradeSteps();
      buildDistributionSections();
      buildResultsCards();
      buildFaqAccordion();
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
      const poolUsdEl = document.getElementById("pool-usd");
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
      if (poolUsdEl) {
        const usd = data.distributionPool.amountUsd;
        poolUsdEl.textContent = usd !== null && usd !== undefined
          ? `$${formatNumber(usd, 2)}`
          : (I18N["pool.usdPlaceholder"] || "—$");
      }
    }
  } catch (_) {
    if (statusEl) statusEl.textContent = I18N["market.unavailable"] || missingKey("market.unavailable");
    setText("market-holders", null, "market.na");
    setText("market-trades", null, "market.na");
    setText("market-liquidity", null, "market.na");
    setText("market-cap", null, "market.na");
    const poolUsdEl = document.getElementById("pool-usd");
    if (poolUsdEl) poolUsdEl.textContent = I18N["pool.usdPlaceholder"] || "—$";
    const poolAmountEl = document.getElementById("pool-amount");
    if (poolAmountEl) {
      const text = template(I18N["pool.amount"] || missingKey("pool.amount"), {
        AMOUNT: I18N["market.na"] || missingKey("market.na"),
      });
      poolAmountEl.textContent = text;
    }
    const poolUpdatedEl = document.getElementById("pool-updated");
    if (poolUpdatedEl) poolUpdatedEl.textContent = I18N["market.na"] || missingKey("market.na");
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
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-copy") || "";
      const status = btn.closest(".copy-row")?.querySelector(".copy-status");
      try {
        await navigator.clipboard.writeText(value);
        if (status) status.textContent = I18N["howto.copied"] || missingKey("howto.copied");
      } catch (_) {
        const input = btn.closest(".copy-row")?.querySelector("input");
        if (input) {
          input.select();
          document.execCommand("copy");
          if (status) status.textContent = I18N["howto.copied"] || missingKey("howto.copied");
        }
      }
    });
  });

  if (document.getElementById("market-section")) {
    fetchMarket();
    setInterval(fetchMarket, MARKET_INTERVAL_SEC * 1000);
  }

  if (document.getElementById("supply-section")) {
    fetchSupply();
    setInterval(fetchSupply, SUPPLY_INTERVAL_MS);
  }
});
