# ARCHITECTURE — BOOKINDER

## Stack

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Framer Motion

---

## Structure

/app
/page.tsx
/search/page.tsx
/api/search/route.ts

/components
SearchBar.tsx
ResultCard.tsx
Loader.tsx

/lib
google.ts

---

## API Flow

Frontend → /api/search → Google API → Filter PDFs → Return JSON

---

## Environment

GOOGLE_API_KEY=
GOOGLE_CSE_ID=
