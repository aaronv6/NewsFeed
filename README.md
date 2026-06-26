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
cd /Users/aaron/Desktop/MyApps/NewsFeed
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Notes

- This project uses public RSS feeds plus browser-side proxy fallback, so some feeds may occasionally be rate-limited or blocked by providers.
- It is designed to work well as a static site on GitHub Pages, Netlify, Cloudflare Pages, or Vercel.
