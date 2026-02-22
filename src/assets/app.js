const MARKET_INTERVAL_SEC = 30;
const SUPPLY_INTERVAL_MS = 60000;
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

let currentLang = "en";
let I18N = {};
let introController = null;

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

function formatJst(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
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

  buildFaqAccordion();
  updateRevenueUseImage();
  updateDistributionFlowImage();
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
  const primaryEl = intro.querySelector(".intro-line.primary");
  const secondaryEl = intro.querySelector(".intro-line.secondary");
  if (!primaryEl || !secondaryEl) return;

  const demonEl = intro.querySelector(".intro-demon");
  const heavenEl = intro.querySelector(".intro-heaven");

  const getLine = (n) => I18N[`intro.l${n}`] || missingKey(`intro.l${n}`);
  const lines = Array.from({ length: 18 }, (_, i) => getLine(i + 1));

  if (introController && introController.cancel) {
    introController.cancel();
  }

  document.documentElement.classList.add("intro-active");
  let timerId = null;
  let cancelled = false;
  const skipBtn = intro.querySelector(".intro-skip");

  const steps = [
    { light: "dim", primary: 1, fast: false, hold: 2400 },
    { secondary: 2, hold: 2200 },
    { clear: true, hold: 800, fade: true },
    { light: "dark", hold: 700 },
    { primary: 3, demon: "show", demonZoom: true, fast: true, hold: 2800 },
    { clear: true, hold: 1200, fade: true },
    { primary: 4, hold: 1500 },
    { secondary: 5, hold: 2200 },
    { clear: true, hold: 800, fade: true },
    { primary: 6, hold: 2200 },
    { clear: true, hold: 800, fade: true },
    { primary: 7, hold: 2300 },
    { clear: true, hold: 1000, fade: true },
    { secondary: 8, hold: 1600 },
    { clear: true, hold: 800, fade: true },
    { secondary: 9, hold: 1600 },
    { clear: true, hold: 800, fade: true },
    { secondary: 10, hold: 1600 },
    { clear: true, hold: 900, fade: true },
    { primary: 11, hold: 2600 },
    { clear: true, hold: 1100, fade: true },
    { light: "dark", demon: "hide", hold: 2000 },
    { light: "strong", hold: 700 },
    { light: "strong", heaven: "show", heavenZoom: true, primary: 12, hold: 2800 },
    { clear: true, hold: 1000, fade: true },
    { primary: 13, hold: 1500 },
    { secondary: 14, hold: 1500 },
    { clear: true, hold: 800, fade: true },
    { primary: 15, hold: 1700 },
    { clear: true, hold: 800, fade: true },
    { primary: 16, hold: 1700 },
    { clear: true, hold: 800, fade: true },
    { primary: 17, hold: 1900, slow: true },
    { clear: true, hold: 900, fade: true },
    { heaven: "hide", light: "dark", hold: 1800 },
    { light: "reveal", primary: 18, final: true, hold: 2600 }
  ];

  function setLight(mode) {
    intro.classList.remove("intro-dark", "intro-light-dim", "intro-light-strong", "intro-reveal");
    if (mode === "dim") intro.classList.add("intro-light-dim");
    else if (mode === "strong") intro.classList.add("intro-light-strong");
    else if (mode === "reveal") intro.classList.add("intro-reveal");
    else intro.classList.add("intro-dark");
  }

  function setLine(el, text, show, fast, final) {
    el.textContent = text || "";
    el.classList.toggle("show", show);
    el.classList.toggle("fast", !!fast);
    el.classList.toggle("final", !!final);
    el.classList.remove("instant");
  }

  function clearLines(fade) {
    if (fade) {
      primaryEl.classList.remove("show", "fast", "final");
      secondaryEl.classList.remove("show", "fast", "final");
      setTimeout(() => {
        primaryEl.textContent = "";
        secondaryEl.textContent = "";
      }, 500);
      return;
    }
    primaryEl.classList.add("instant");
    secondaryEl.classList.add("instant");
    primaryEl.classList.remove("show", "fast", "final");
    secondaryEl.classList.remove("show", "fast", "final");
    primaryEl.textContent = "";
    secondaryEl.textContent = "";
  }

  function setDemon(state) {
    if (!demonEl) return;
    if (state === "show") {
      demonEl.classList.add("show");
      demonEl.classList.remove("zoom");
      return;
    }
    if (state === "zoom") {
      demonEl.classList.add("show");
      demonEl.classList.add("zoom");
      return;
    }
    demonEl.classList.remove("show", "zoom");
  }

  function setHeaven(state) {
    if (!heavenEl) return;
    if (state === "show") {
      heavenEl.classList.add("show");
      heavenEl.classList.remove("zoom");
      return;
    }
    if (state === "zoom") {
      heavenEl.classList.add("show");
      heavenEl.classList.add("zoom");
      return;
    }
    heavenEl.classList.remove("show", "zoom");
  }

  function finishIntro() {
    intro.classList.add("hidden");
    if (timerId) clearTimeout(timerId);
    setTimeout(() => {
      intro.remove();
      document.documentElement.classList.remove("intro-active");
      document.documentElement.classList.add("intro-done");
      const prologue = document.getElementById("prologue-section");
      if (prologue) {
        prologue.classList.add("prologue-show-all");
        prologue.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 1200);
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      cancelled = true;
      finishIntro();
    });
  }

  introController = {
    cancel: () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    }
  };

  let idx = 0;
  function nextStep() {
    if (cancelled) return;
    const step = steps[idx];
    if (!step) return finishIntro();

    if (step.light) setLight(step.light);
    if (step.demon === "show") {
      setDemon("show");
      if (step.demonZoom) {
        setTimeout(() => setDemon("zoom"), 120);
      }
    } else if (step.demon === "hide") {
      setDemon("hide");
    }
    if (step.heaven === "show") {
      setHeaven("show");
      if (step.heavenZoom) {
        setTimeout(() => setHeaven("zoom"), 120);
      }
    } else if (step.heaven === "hide") {
      setHeaven("hide");
    }

    if (step.clear) {
      clearLines(step.fade);
    } else {
      const primaryText = step.primary ? lines[step.primary - 1] : primaryEl.textContent;
      const secondaryText = step.secondary ? lines[step.secondary - 1] : secondaryEl.textContent;
      if (step.primary) setLine(primaryEl, primaryText, true, step.fast, step.final);
      if (step.secondary) setLine(secondaryEl, secondaryText, true, false, false);
    }

    idx += 1;
    timerId = setTimeout(nextStep, step.hold || 1600);
  }

  nextStep();
}

function buildTradeSteps() {
  const source = document.getElementById("trade-body-source");
  const stepsEl = document.getElementById("trade-steps");
  const introEl = document.getElementById("trade-intro");
  if (!source || !stepsEl || !introEl) return;

  const html = source.innerHTML || source.textContent || "";
  const sepRegex = /(━{5,}|─{5,}|—{5,})/;
  const rawLines = html
    .split("<br>")
    .map((line) => line.trim())
    .filter((line) => line);
  const lines = rawLines.filter((line) => !sepRegex.test(line));
  const stepRegex = /(STEP\\s*\\d+|【STEP\\s*\\d+】|STEP\\s*\\d+：|STEP\\s*\\d+\\s*：|STEP\\s*\\d+\\s*\\-|STEP\\s*\\d+\\s*：|步骤\\s*\\d+)/i;

  const headingRegexes = [
    /STEP\\s*\\d+/i,
    /【STEP\\s*\\d+】/i,
    /步骤\\s*\\d+/,
    /第[一二三四五六七八九十]+步/,
    /購入完了後の確認/,
    /よくある質問/,
    /重要な注意事項/,
    /【免責事項】/,
    /Confirmation After Purchase/i,
    /After Purchase Confirmation/i,
    /Frequently Asked Questions/i,
    /Important Notes/i,
    /【Disclaimer】/i,
    /^\\[Disclaimer\\]/i,
    /^Disclaimer/i,
    /购买完成后确认/,
    /购买完成后的确认/,
    /常见问题/,
    /重要注意事项/,
    /【免责声明】/,
  ];

  const found = [];
  lines.forEach((line, idx) => {
    if (headingRegexes.some((rx) => rx.test(line))) {
      found.push({ idx, title: line });
    }
  });

  const sections = [];
  if (found.length) {
    for (let i = 0; i < found.length; i += 1) {
      const start = found[i].idx;
      const end = i + 1 < found.length ? found[i + 1].idx : lines.length;
      const bodyLines = lines.slice(start + 1, end);
      sections.push({ title: found[i].title, body: bodyLines });
    }
  } else {
    const blocks = [];
    let currentBlock = [];
    rawLines.forEach((line) => {
      if (sepRegex.test(line)) {
        if (currentBlock.length) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
        return;
      }
      currentBlock.push(line);
    });
    if (currentBlock.length) blocks.push(currentBlock);

    blocks.forEach((block) => {
      if (!block.length) return;
      const title = block[0];
      const bodyLines = block.slice(1);
      sections.push({ title, body: bodyLines });
    });
  }

  const imageMap = {
    "3": ["/assets/img/step3.jpeg"],
    "4": ["/assets/img/step4.jpeg"],
    "4-2": ["/assets/img/step4-2.jpeg"],
    "5": ["/assets/img/step5.jpeg"],
    "7-1": ["/assets/img/step7-1.jpeg"],
    "7-2": ["/assets/img/step7-2.jpeg"],
    "8-1": ["/assets/img/step8-1.jpeg"],
    "9-1": ["/assets/img/step9-1.jpeg"],
    "9": ["/assets/img/step9-1.jpeg"],
  };

  const cards = [];
  sections.forEach((section) => {
    const instructionRegex = /”([^”]+)”/g;
    const stripInstructions = (line) => line.replace(instructionRegex, "").trim();
    const title = stripInstructions(
      section.title.replace(/（見出し）/g, "").replace(/━+/g, "")
    );
    const bodyLines = section.body
      .map((line) => line.replace(/（見出し）/g, "").trim())
      .filter((line) => line);
    const stepMatch = title.match(/(?:STEP|步骤)\\s*(\\d+)/i);
    const stepNum = stepMatch ? stepMatch[1] : null;
    const images = [];
    if (stepNum && imageMap[stepNum]) images.push(...imageMap[stepNum]);
    const listItems = [];
    let caValue = null;
    const linkify = (text) =>
      text.replace(/(https?:\/\/[^\s)]+)/g, (match) =>
        `<a href="${match}" target="_blank" rel="noopener">${match}</a>`
      );
    const normalizeDigits = (value) =>
      value.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFF10 + 0x30));
    const stepInstrRegexes = [
      /Step\\s*([0-9０-９]+)\\s*[-―ー–—]?\\s*([0-9０-９]+)?/i,
      /步骤\\s*([0-9０-９]+)\\s*[-―ー–—]?\\s*([0-9０-９]+)?/i,
      /([0-9０-９]+)\\s*[-―ー–—]?\\s*([0-9０-９]+)?\\s*图片/i,
    ];
    bodyLines.forEach((line) => {
      const instructions = [];
      let cleaned = line.replace(instructionRegex, (_, instr) => {
        instructions.push(instr.trim());
        return "";
      }).trim();
      cleaned = cleaned.replace(/（[^）]*簡単にコピーできる形にして[^）]*）/g, "").trim();

      let linkUrl = null;
      instructions.forEach((instr) => {
        const urlMatch = instr.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
          linkUrl = urlMatch[0];
          if (/招待コード|Referral Code|推荐码|Referral/i.test(instr)) {
            listItems.push(`<li>${linkify(instr)}</li>`);
          }
        }
        if (/画像を表示|Display|image|图片|显示/i.test(instr)) {
          let stepMatch = null;
          for (const rx of stepInstrRegexes) {
            const m = instr.match(rx);
            if (m) {
              stepMatch = m;
              break;
            }
          }
          if (stepMatch) {
            const main = normalizeDigits(stepMatch[1] || "");
            const sub = stepMatch[2] ? normalizeDigits(stepMatch[2]) : null;
            const key = sub ? `${main}-${sub}` : main;
            if (imageMap[key]) images.push(...imageMap[key]);
          }
        }
      });

      if (!cleaned) {
        return;
      }

      const caMatch = cleaned.match(/CA\s*[:：]\s*([A-Za-z0-9]+)/);
      if (caMatch) {
        caValue = caMatch[1];
      }
      cleaned = linkify(cleaned);
      if (linkUrl && /タップ|tap|点击/i.test(instructions.join(" "))) {
        cleaned = `<a href="${linkUrl}" target="_blank" rel="noopener">${cleaned}</a>`;
      }
      listItems.push(`<li>${cleaned}</li>`);
    });
    const listHtml = `<ul class="step-list">${listItems.join("")}</ul>`;
    const copyLabel = I18N["howto.copy"] || "Copy";
    const copyHint = I18N["howto.copyHint"] || "";
    const caLabel = I18N["howto.caLabel"] || "CA";
    const copyHtml = caValue
      ? `<div class="copy-row"><div class="muted">${caLabel}</div><div class="copy-box"><input type="text" readonly value="${caValue}" aria-label="CA" /><button type="button" class="button" data-copy="${caValue}">${copyLabel}</button></div><div class="copy-status">${copyHint}</div></div>`
      : "";
    const imagesHtml = images.length
      ? `<div class="trade-step-images">${images.map((src) => `<img src="${src}" alt="${title}">`).join("")}</div>`
      : "";
    cards.push(`<div class="trade-step"><h3>${title}</h3>${listHtml}${copyHtml}${imagesHtml}</div>`);
  });

  const introLines = found.length ? lines.slice(0, found[0].idx) : [];
  if (introLines.length) {
    introEl.style.display = "";
    introEl.innerHTML = introLines.map((line) => `<p>${line}</p>`).join("");
  } else {
    introEl.style.display = "none";
    introEl.innerHTML = "";
  }
  stepsEl.innerHTML = cards.join("");
}

function buildFaqAccordion() {
  const el = document.querySelector('[data-i18n="faq.body"]');
  if (!el || !I18N["faq.body"]) return;
  const raw = I18N["faq.body"];
  const lines = raw
    .split("<br>")
    .map((line) => line.trim())
    .filter((line) => line);
  const sections = [];
  let current = null;
  const questionRegex = /^\d+\.\s+|^Q\d+/i;
  lines.forEach((line) => {
    if (questionRegex.test(line)) {
      if (current) sections.push(current);
      current = { q: line, a: [] };
    } else if (current) {
      current.a.push(line);
    }
  });
  if (current) sections.push(current);

  if (!sections.length) return;
  const html = sections
    .map((item) => {
      const answer = item.a.join(" ");
      return `<details><summary>${item.q}</summary><div class="faq-answer">${answer}</div></details>`;
    })
    .join("");
  el.innerHTML = `<div class="faq-list">${html}</div>`;
}

function updateRevenueUseImage() {
  const img = document.querySelector("[data-revenue-use]");
  if (!img) return;
  const map = {
    ja: "/assets/img/revenue-use.jpg",
    en: "/assets/img/revenue-use.en.png",
    zh: "/assets/img/revenue-use.zh.png",
  };
  img.setAttribute("src", map[currentLang] || map.en);
}

function updateDistributionFlowImage() {
  const imgs = document.querySelectorAll("[data-distribution-flow]");
  if (!imgs.length) return;
  const map = {
    ja: "/assets/img/distribution.jp.png",
    en: "/assets/img/distribution.en.png",
    zh: "/assets/img/distribution.zh.jpg",
  };
  imgs.forEach((img) => {
    img.setAttribute("src", map[currentLang] || map.en);
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
      startPrologue();
      startIntroSequence();
      buildTradeSteps();
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
    const res = await fetch("/api/supply", { cache: "no-store" });
    if (!res.ok) throw new Error("supply");
    const data = await res.json();
    if (!data || !data.ok) throw new Error("supply");

    const pctEl = document.getElementById("supply-01");
    const updatedLabel = I18N["distribution.table.updated"] || missingKey("distribution.table.updated");

    let supplyText = null;
    if (data.supply01pctStr) {
      supplyText = data.supply01pctStr;
    } else if (Number.isFinite(data.supply01pct)) {
      supplyText = formatNumber(data.supply01pct, 6);
    }
    if (pctEl) {
      const suffix = I18N["distribution.table.supplySuffix"] || "";
      if (Number.isFinite(data.supply01pct)) {
        pctEl.textContent = `${Math.floor(data.supply01pct).toLocaleString()}${suffix}`;
      } else if (data.supply01pctStr) {
        const rounded = Math.floor(Number(data.supply01pctStr));
        pctEl.textContent = Number.isFinite(rounded)
          ? `${rounded.toLocaleString()}${suffix}`
          : data.supply01pctStr;
      } else {
        pctEl.textContent = I18N["market.na"] || "—";
      }
    }
    const updatedText = formatJst(new Date(data.asOf));
    if (statusEl) statusEl.textContent = updatedText ? `${updatedLabel}: ${updatedText}` : "";
  } catch (_) {
    const ok = await fetchSupplyDirect();
    if (!ok && statusEl) {
      statusEl.textContent = I18N["distribution.table.error"] || missingKey("distribution.table.error");
    }
  }
}

async function fetchSupplyDirect() {
  try {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenSupply",
      params: ["9SbNtqtnXbSGKvQv6G1XMzmoiEMNHoNWQNtMz7sbpump"]
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
    const amountStr = value.amount;
    if (!amountStr) throw new Error("rpc");
    const amountBig = BigInt(String(amountStr));
    const formatFromBigInt = (bigValue, decimalPlaces) => {
      const isNegative = bigValue < 0n;
      const raw = (isNegative ? -bigValue : bigValue).toString();
      if (decimalPlaces === 0) return (isNegative ? "-" : "") + raw;
      const padded = raw.padStart(decimalPlaces + 1, "0");
      const intPart = padded.slice(0, -decimalPlaces);
      const fracPart = padded.slice(-decimalPlaces).replace(/0+$/, "") || "0";
      return `${isNegative ? "-" : ""}${intPart}.${fracPart}`;
    };
    const supply01pctStr = formatFromBigInt(amountBig, decimals + 3);
    const pctEl = document.getElementById("supply-01");
    if (pctEl) {
      const suffix = I18N["distribution.table.supplySuffix"] || "";
      const rounded = Math.floor(Number(supply01pctStr));
      pctEl.textContent = Number.isFinite(rounded)
        ? `${rounded.toLocaleString()}${suffix}`
        : supply01pctStr;
    }
    const statusEl = document.getElementById("supply-status");
    const updatedLabel = I18N["distribution.table.updated"] || missingKey("distribution.table.updated");
    const updatedText = formatJst(new Date());
    if (statusEl) statusEl.textContent = `${updatedLabel}: ${updatedText}`;
    return true;
  } catch (_) {
    return false;
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
