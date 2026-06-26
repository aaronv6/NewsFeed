# News Feed

A lightweight static web app that pulls U.S. news from public RSS feeds for NPR, Fox, CBS, and ABC. It includes source toggles, category filters, and a simple article reader modal.

## Features

- Toggle individual news sources on and off
- Filter by category such as Top, Technology, Business, Politics, and Health
- Open articles in a modal with reader view or original site view
- Refresh the feed and show error states when feeds fail

## Run locally

Open the project folder in a browser, or serve it from a local web server:

```bash
cd <path-to-project>/NewsFeed
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## GitHub Pages

Once GitHub Pages is enabled for this repository, the site will be available at:

https://aaronv6.github.io/newsfeed.github.io/

If you want the shorter custom domain https://newsfeed.github.io/, that requires a custom domain setup in GitHub Pages settings or a repo owned by the `newsfeed` account.

## Notes

- This project uses public RSS feeds plus browser-side proxy fallback, so some feeds may occasionally be rate-limited or blocked by providers.
- It is designed to work well as a static site on GitHub Pages, Netlify, Cloudflare Pages, or Vercel.

## CORS and proxy notes

- If you see errors like "No 'Access-Control-Allow-Origin' header is present" when running the app from GitHub Pages or a browser, the remote site is blocking cross-origin requests. The app attempts several public CORS proxies, but public proxies can be intermittent.

- For reliable local testing, you can run the included simple proxy server which adds the necessary CORS header. It requires Node 18+ (for global `fetch`) and is for development only:

```bash
node proxy-server.js
# then update `script.js` to prefer the local proxy (optional):
# add 'http://localhost:8080/fetch?url=' to the start of the `corsProxies` array
```

- Alternatively, deploy a small serverless function (Cloudflare Worker, Netlify Function, Vercel Serverless) to proxy feed requests and return `Access-Control-Allow-Origin: *` for production usage.
