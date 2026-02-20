# Implementation Plan

1. Extract the required content from `docs/ウェブ設計.docx` and map it into an i18n dictionary (ja/zh/en), including common header/footer strings and each page’s body copy.
2. Implement the shared layout (header, footer) and page structures in `src/*.html`, wiring all text via `data-i18n` attributes and placeholders required by the spec.
3. Build `src/assets/styles.css` for a simple, professional tech UI and `src/assets/app.js` to handle language detection (`/api/geo`), localStorage, i18n rendering, and market/holders data rendering/fallbacks.
4. Implement serverless functions `functions/api/market.js` (DexScreener + optional Birdeye, caching) and `functions/api/geo.js` (country/lang response).
5. Document deployment and verification steps in `README.md`.
