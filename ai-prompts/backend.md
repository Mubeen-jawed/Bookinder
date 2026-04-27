# BACKEND LOGIC

## Endpoint: /api/search

* Accept query param
* Modify:
  query + " filetype:pdf"

---

## Fetch

Use Google Custom Search API

---

## Filter

* Only links containing ".pdf"

---

## Return

{
title,
link,
snippet,
domain
}

---

## Error Handling

* Handle empty results
* Handle API failure
