# Bookinder

Minimal Next.js app that finds publicly available PDF versions of books via the Google Custom Search API.

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in GOOGLE_API_KEY and GOOGLE_CSE_ID
npm run dev
```

Open http://localhost:3000

## Environment

- `GOOGLE_API_KEY` — Google Cloud API key with Custom Search enabled
- `GOOGLE_CSE_ID` — Programmable Search Engine ID (configured to search the whole web)
