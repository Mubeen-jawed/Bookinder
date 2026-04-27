export type BookResult = {
  title: string;
  link: string;
  snippet: string;
  domain: string;
  coverUrl: string | null;
  pdfUrl: string | null;
};

type Source = "brave" | "ia" | "ol";

type EnrichedResult = BookResult & {
  pageCount: number | null;
  source: Source;
};

const SOURCE_RANK: Record<Source, number> = { brave: 0, ia: 1, ol: 2 };

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  ia?: string[];
  ebook_access?: "no_ebook" | "printdisabled" | "borrowable" | "public";
  edition_count?: number;
  cover_i?: number;
  cover_edition_key?: string;
  number_of_pages_median?: number;
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

type InternetArchiveDoc = {
  identifier?: string;
  title?: string | string[];
  creator?: string | string[];
  year?: string | number;
  subject?: string | string[];
  format?: string | string[];
  imagecount?: number;
};

type InternetArchiveResponse = {
  response?: {
    docs?: InternetArchiveDoc[];
  };
};

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  content_type?: string;
  profile?: { long_name?: string };
};

type BraveResponse = {
  web?: { results?: BraveResult[] };
};

const OPEN_LIBRARY_ENDPOINT = "https://openlibrary.org/search.json";
const INTERNET_ARCHIVE_ENDPOINT = "https://archive.org/advancedsearch.php";
const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export type SearchResponse = {
  results: BookResult[];
  suggestion: string | null;
};

export type SourceTier = "primary" | "secondary";

export async function searchBookPDFs(
  rawQuery: string,
  tier: SourceTier = "primary"
): Promise<SearchResponse> {
  const query = rawQuery.trim();
  if (!query) return { results: [], suggestion: null };

  const fetched =
    tier === "primary"
      ? await Promise.all([
          searchBrave(query).catch(() => [] as EnrichedResult[]),
        ])
      : await Promise.all([
          searchInternetArchive(query).catch(() => [] as EnrichedResult[]),
          searchOpenLibrary(query).catch(() => [] as EnrichedResult[]),
        ]);

  const merged = mergeByTitle(fetched.flat());
  const filtered = filterRelevant(merged, query);
  await enrichMissingCovers(filtered);
  const sorted = sortResults(filtered, query);

  const suggestion =
    tier === "primary" && sorted.length < 3
      ? await getSpellingSuggestion(query)
      : null;

  return {
    results: sorted.map(
      ({ pageCount: _pageCount, source: _source, ...rest }) => rest
    ),
    suggestion,
  };
}

async function searchInternetArchive(query: string): Promise<EnrichedResult[]> {
  const url = new URL(INTERNET_ARCHIVE_ENDPOINT);
  url.searchParams.set("q", `${query} AND mediatype:texts`);
  url.searchParams.append("fl[]", "identifier");
  url.searchParams.append("fl[]", "title");
  url.searchParams.append("fl[]", "creator");
  url.searchParams.append("fl[]", "year");
  url.searchParams.append("fl[]", "subject");
  url.searchParams.append("fl[]", "format");
  url.searchParams.append("fl[]", "imagecount");
  url.searchParams.set("rows", "15");
  url.searchParams.set("output", "json");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) throw new Error(`Internet Archive error: ${response.status}`);

  const data = (await response.json()) as InternetArchiveResponse;
  const docs = data.response?.docs ?? [];

  return docs
    .filter((doc) => Boolean(doc.identifier))
    .map<EnrichedResult>((doc) => {
      const id = doc.identifier as string;
      const title = pickFirst(doc.title) ?? "Untitled";
      const author = pickFirst(doc.creator);
      const year = doc.year ? String(doc.year) : null;
      const subject = pickFirst(doc.subject);
      const formats = toArray(doc.format).map((f) => f.toLowerCase());
      const hasPdf = formats.some((f) => f.includes("pdf"));

      const snippet = [author ? `By ${author}` : null, year, subject]
        .filter(Boolean)
        .join(" · ");

      return {
        title,
        link: `https://archive.org/details/${id}`,
        snippet,
        domain: "archive.org",
        coverUrl: `https://archive.org/services/img/${id}`,
        pdfUrl: hasPdf ? `https://archive.org/download/${id}/${id}.pdf` : null,
        pageCount: doc.imagecount ?? null,
        source: "ia",
      };
    });
}

async function searchOpenLibrary(query: string): Promise<EnrichedResult[]> {
  const url = new URL(OPEN_LIBRARY_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "15");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,ia,ebook_access,edition_count,cover_i,cover_edition_key,number_of_pages_median"
  );

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) throw new Error(`Open Library error: ${response.status}`);

  const data = (await response.json()) as OpenLibraryResponse;
  const docs = data.docs ?? [];

  return docs.map<EnrichedResult>((doc) => {
    const iaId = doc.ia?.[0];
    const hasReader =
      Boolean(iaId) && doc.ebook_access && doc.ebook_access !== "no_ebook";

    const link = hasReader
      ? `https://archive.org/details/${iaId}`
      : `https://openlibrary.org${doc.key ?? ""}`;
    const domain = hasReader ? "archive.org" : "openlibrary.org";

    const author = doc.author_name?.[0];
    const year = doc.first_publish_year;
    const snippet = [
      author ? `By ${author}` : null,
      year ? String(year) : null,
      doc.edition_count ? `${doc.edition_count} editions` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    let coverUrl: string | null = null;
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (doc.cover_edition_key) {
      coverUrl = `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`;
    } else if (iaId) {
      coverUrl = `https://archive.org/services/img/${iaId}`;
    }

    const pdfUrl =
      iaId && doc.ebook_access === "public"
        ? `https://archive.org/download/${iaId}/${iaId}.pdf`
        : null;

    return {
      title: doc.title ?? "Untitled",
      link,
      snippet,
      domain,
      coverUrl,
      pdfUrl,
      pageCount: doc.number_of_pages_median ?? null,
      source: "ol",
    };
  });
}

async function searchBrave(query: string): Promise<EnrichedResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return [];

  const url = new URL(BRAVE_ENDPOINT);
  url.searchParams.set("q", `${query} filetype:pdf`);
  url.searchParams.set("count", "15");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      "X-Subscription-Token": apiKey,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Brave API error: ${response.status}`);

  const data = (await response.json()) as BraveResponse;
  const results = data.web?.results ?? [];

  return results
    .filter((r) => r.url && r.url.toLowerCase().includes(".pdf"))
    .map<EnrichedResult>((r) => ({
      title: stripHtml(r.title ?? "Untitled"),
      link: r.url as string,
      snippet: stripHtml(r.description ?? ""),
      domain: r.profile?.long_name ?? extractDomain(r.url as string),
      coverUrl: null,
      pdfUrl: r.url as string,
      pageCount: null,
      source: "brave",
    }));
}

async function enrichMissingCovers(results: EnrichedResult[]): Promise<void> {
  await Promise.all(
    results.map(async (r) => {
      if (r.coverUrl) return;
      try {
        const url = new URL(OPEN_LIBRARY_ENDPOINT);
        url.searchParams.set("title", r.title);
        url.searchParams.set("limit", "1");
        url.searchParams.set("fields", "cover_i,number_of_pages_median");
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as OpenLibraryResponse;
        const doc = data.docs?.[0];
        if (doc?.cover_i) {
          r.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
        }
        if (r.pageCount == null && doc?.number_of_pages_median) {
          r.pageCount = doc.number_of_pages_median;
        }
      } catch {
        // ignore — leave cover as null, placeholder will render
      }
    })
  );
}

function mergeByTitle(results: EnrichedResult[]): EnrichedResult[] {
  const map = new Map<string, EnrichedResult>();
  for (const r of results) {
    const key = normalize(r.title);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
      continue;
    }
    const winner =
      (existing.pageCount ?? 0) >= (r.pageCount ?? 0) ? existing : r;
    const loser = winner === existing ? r : existing;
    const bestSource =
      SOURCE_RANK[existing.source] <= SOURCE_RANK[r.source]
        ? existing.source
        : r.source;
    map.set(key, {
      ...winner,
      coverUrl: winner.coverUrl ?? loser.coverUrl,
      pdfUrl: winner.pdfUrl ?? loser.pdfUrl,
      snippet: winner.snippet || loser.snippet,
      source: bestSource,
    });
  }
  return Array.from(map.values());
}

function sortResults(
  results: EnrichedResult[],
  query: string
): EnrichedResult[] {
  const q = query.toLowerCase();
  return [...results].sort((a, b) => {
    if (a.source !== b.source) return SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
    const aExact = a.title.toLowerCase().includes(q) ? 1 : 0;
    const bExact = b.title.toLowerCase().includes(q) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return (b.pageCount ?? 0) - (a.pageCount ?? 0);
  });
}

function pickFirst(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "to", "for", "by",
  "with", "is", "at", "from", "as", "book", "books", "pdf",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function filterRelevant(
  results: EnrichedResult[],
  query: string
): EnrichedResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return results;

  return results.filter((r) => {
    const haystack = `${r.title} ${r.snippet}`.toLowerCase();
    const titleLower = r.title.toLowerCase();

    if (looksLikeJunk(titleLower)) return false;

    const matches = tokens.filter((t) => haystack.includes(t)).length;
    const required = Math.min(tokens.length, Math.max(1, Math.ceil(tokens.length / 2)));
    return matches >= required;
  });
}

function looksLikeJunk(title: string): boolean {
  if (title.length < 3) return true;
  if (/microsoft\s+word\s*-/i.test(title)) return true;
  if (/\.(doc|docx|tex|tmp)\b/i.test(title)) return true;
  if (/^untitled$/i.test(title)) return true;
  return false;
}

async function getSpellingSuggestion(query: string): Promise<string | null> {
  try {
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("printType", "books");
    url.searchParams.set("fields", "items(volumeInfo(title))");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { volumeInfo?: { title?: string } }[];
    };
    const top = data.items?.[0]?.volumeInfo?.title?.trim();
    if (!top) return null;
    if (normalize(top) === normalize(query)) return null;
    return top;
  } catch {
    return null;
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
