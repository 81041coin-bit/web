# 81041 Web

## Deploy
1. Deploy this repository with Cloudflare Pages.
2. Ensure Pages Functions are enabled for `/api/market`, `/api/geo`, and `/api/supply`.
3. (Optional) Set the environment variable `BIRDEYE_API_KEY` to enable holder counts.

## Verify
1. Open `index.html` and confirm language auto-detection works and can be switched via the header buttons.
2. Confirm Live Metrics loads on the Home page and updates every 30 seconds (holders, trades, liquidity, market cap).
3. Confirm the Distribution Pool Balance is displayed on the Home page.
4. Open `distribution.html` and verify the supply table updates every 5 minutes.
5. Check each static page (`trade-guide.html`, `results.html`, `report.html`, `faq.html`, `privacy.html`, `terms.html`, `disclaimer.html`) for correct language switching.
