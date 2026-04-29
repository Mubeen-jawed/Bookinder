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

  const genre = detectGenre(query);

  if (genre) {
    if (tier === "primary") {
      const [genreResults, suggestionCandidate] = await Promise.all([
        searchGoogleBooksBySubject(genre).catch(() => [] as EnrichedResult[]),
        Promise.resolve(null),
      ]);
      const merged = mergeByTitle(genreResults);
      const sorted = sortResults(merged, query);
      return {
        results: sorted.map(
          ({ pageCount: _pageCount, source: _source, ...rest }) => rest
        ),
        suggestion: suggestionCandidate,
      };
    }

    const fetched = await Promise.all([
      searchOpenLibraryBySubject(genre).catch(() => [] as EnrichedResult[]),
      searchInternetArchiveBySubject(genre).catch(() => [] as EnrichedResult[]),
    ]);
    const merged = mergeByTitle(fetched.flat());
    await enrichMissingCovers(merged);
    const sorted = sortResults(merged, query);
    return {
      results: sorted.map(
        ({ pageCount: _pageCount, source: _source, ...rest }) => rest
      ),
      suggestion: null,
    };
  }

  if (tier === "primary") {
    // Run Brave, Google Books cover lookup, and the spelling suggestion all
    // in parallel — Google Books returns covers + titles for the whole query
    // in a single request, so we get covers without the per-result fan-out.
    const [braveResults, coverMap, suggestionCandidate] = await Promise.all([
      searchBrave(query).catch(() => [] as EnrichedResult[]),
      fetchGoogleBooksCoverMap(query).catch(
        () => new Map<string, { coverUrl: string; pageCount: number | null }>()
      ),
      getSpellingSuggestion(query).catch(() => null),
    ]);

    for (const r of braveResults) {
      if (r.coverUrl && r.pageCount != null) continue;
      const hit = coverMap.get(normalize(r.title));
      if (!hit) continue;
      if (!r.coverUrl) r.coverUrl = hit.coverUrl;
      if (r.pageCount == null) r.pageCount = hit.pageCount;
    }

    const merged = mergeByTitle(braveResults);
    const filtered = filterRelevant(merged, query);
    const sorted = sortResults(filtered, query);

    const suggestion = sorted.length < 3 ? suggestionCandidate : null;

    return {
      results: sorted.map(
        ({ pageCount: _pageCount, source: _source, ...rest }) => rest
      ),
      suggestion,
    };
  }

  const fetched = await Promise.all([
    searchInternetArchive(query).catch(() => [] as EnrichedResult[]),
    searchOpenLibrary(query).catch(() => [] as EnrichedResult[]),
  ]);

  const merged = mergeByTitle(fetched.flat());
  const filtered = filterRelevant(merged, query);
  await enrichMissingCovers(filtered);
  const sorted = sortResults(filtered, query);

  return {
    results: sorted.map(
      ({ pageCount: _pageCount, source: _source, ...rest }) => rest
    ),
    suggestion: null,
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

type GoogleBooksResponse = {
  items?: {
    volumeInfo?: {
      title?: string;
      imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      pageCount?: number;
    };
  }[];
};

async function fetchGoogleBooksCoverMap(
  query: string
): Promise<Map<string, { coverUrl: string; pageCount: number | null }>> {
  const map = new Map<string, { coverUrl: string; pageCount: number | null }>();
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("printType", "books");
  url.searchParams.set(
    "fields",
    "items(volumeInfo(title,imageLinks/thumbnail,imageLinks/smallThumbnail,pageCount))"
  );

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return map;
  const data = (await res.json()) as GoogleBooksResponse;
  for (const item of data.items ?? []) {
    const info = item.volumeInfo;
    const title = info?.title;
    const thumb = info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail;
    if (!title || !thumb) continue;
    const key = normalize(title);
    if (!key || map.has(key)) continue;
    map.set(key, {
      coverUrl: thumb.replace(/^http:\/\//, "https://"),
      pageCount: info?.pageCount ?? null,
    });
  }
  return map;
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

type Genre = {
  google: string;
  openLibrary: string;
  archive: string;
  label: string;
};

const GENRE_PATTERNS: { match: RegExp; genre: Genre }[] = [
  {
    match: /\b(romance|romantic|love)\b/,
    genre: { google: "Romance", openLibrary: "romance", archive: "romance", label: "Romance" },
  },
  {
    match: /\b(sci[\s-]?fi|science[\s-]?fiction)\b/,
    genre: {
      google: "Science Fiction",
      openLibrary: "science_fiction",
      archive: "science fiction",
      label: "Science Fiction",
    },
  },
  {
    match: /\b(self[\s-]?help|self[\s-]?improvement|personal[\s-]?development)\b/,
    genre: {
      google: "Self-Help",
      openLibrary: "self-help",
      archive: "self-help",
      label: "Self-Help",
    },
  },
  {
    match: /\b(fantasy)\b/,
    genre: { google: "Fantasy", openLibrary: "fantasy", archive: "fantasy", label: "Fantasy" },
  },
  {
    match: /\b(mystery|detective|crime)\b/,
    genre: { google: "Mystery", openLibrary: "mystery", archive: "mystery", label: "Mystery" },
  },
  {
    match: /\b(thriller|suspense)\b/,
    genre: { google: "Thriller", openLibrary: "thriller", archive: "thriller", label: "Thriller" },
  },
  {
    match: /\b(horror)\b/,
    genre: { google: "Horror", openLibrary: "horror", archive: "horror", label: "Horror" },
  },
  {
    match: /\b(biograph(y|ies)|memoir)\b/,
    genre: { google: "Biography", openLibrary: "biography", archive: "biography", label: "Biography" },
  },
  {
    match: /\b(history|historical)\b/,
    genre: { google: "History", openLibrary: "history", archive: "history", label: "History" },
  },
  {
    match: /\b(philosoph(y|ical))\b/,
    genre: { google: "Philosophy", openLibrary: "philosophy", archive: "philosophy", label: "Philosophy" },
  },
  {
    match: /\b(business|entrepreneur(ship)?)\b/,
    genre: { google: "Business", openLibrary: "business", archive: "business", label: "Business" },
  },
  {
    match: /\b(poetry|poems?)\b/,
    genre: { google: "Poetry", openLibrary: "poetry", archive: "poetry", label: "Poetry" },
  },
  {
    match: /\b(children'?s?|kids?)\b/,
    genre: { google: "Juvenile", openLibrary: "children", archive: "children", label: "Children's" },
  },
  {
    match: /\b(young[\s-]?adult|ya)\b/,
    genre: {
      google: "Young Adult",
      openLibrary: "young_adult",
      archive: "young adult",
      label: "Young Adult",
    },
  },
  {
    match: /\b(programming|coding|computer[\s-]?science)\b/,
    genre: {
      google: "Computers",
      openLibrary: "computer_programming",
      archive: "computer programming",
      label: "Programming",
    },
  },
];

function detectGenre(query: string): Genre | null {
  const cleaned = query.toLowerCase().replace(/\bbooks?\b|\bnovels?\b/g, "").trim();
  if (!cleaned) return null;
  for (const { match, genre } of GENRE_PATTERNS) {
    if (match.test(cleaned)) return genre;
  }
  return null;
}

async function searchGoogleBooksBySubject(genre: Genre): Promise<EnrichedResult[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", `subject:"${genre.google}"`);
  url.searchParams.set("maxResults", "30");
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", "relevance");
  url.searchParams.set(
    "fields",
    "items(volumeInfo(title,authors,description,infoLink,previewLink,canonicalVolumeLink,imageLinks/thumbnail,imageLinks/smallThumbnail,pageCount,publishedDate,industryIdentifiers))"
  );

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`);
  const data = (await res.json()) as {
    items?: {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        description?: string;
        infoLink?: string;
        previewLink?: string;
        canonicalVolumeLink?: string;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        pageCount?: number;
        publishedDate?: string;
      };
    }[];
  };

  return (data.items ?? [])
    .map<EnrichedResult | null>((item) => {
      const info = item.volumeInfo;
      if (!info?.title) return null;
      const link =
        info.canonicalVolumeLink ?? info.infoLink ?? info.previewLink ?? "";
      if (!link) return null;
      const thumb =
        info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
      const author = info.authors?.[0];
      const year = info.publishedDate?.slice(0, 4);
      const snippet =
        [author ? `By ${author}` : null, year, genre.label]
          .filter(Boolean)
          .join(" · ") ||
        (info.description ? info.description.slice(0, 160) : "");

      return {
        title: info.title,
        link,
        snippet,
        domain: extractDomain(link) || "books.google.com",
        coverUrl: thumb ? thumb.replace(/^http:\/\//, "https://") : null,
        pdfUrl: null,
        pageCount: info.pageCount ?? null,
        source: "ol",
      };
    })
    .filter((r): r is EnrichedResult => r !== null);
}

async function searchOpenLibraryBySubject(genre: Genre): Promise<EnrichedResult[]> {
  const url = new URL(`https://openlibrary.org/subjects/${genre.openLibrary}.json`);
  url.searchParams.set("limit", "30");
  url.searchParams.set("ebooks", "true");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Open Library subject error: ${res.status}`);

  const data = (await res.json()) as {
    works?: {
      key?: string;
      title?: string;
      authors?: { name?: string }[];
      first_publish_year?: number;
      cover_id?: number;
      cover_edition_key?: string;
      ia?: string[];
      availability?: { identifier?: string; status?: string };
    }[];
  };

  return (data.works ?? [])
    .map<EnrichedResult | null>((w) => {
      if (!w.title || !w.key) return null;
      const iaId = w.ia?.[0] ?? w.availability?.identifier ?? null;
      const link = iaId
        ? `https://archive.org/details/${iaId}`
        : `https://openlibrary.org${w.key}`;
      const domain = iaId ? "archive.org" : "openlibrary.org";
      const author = w.authors?.[0]?.name;
      const snippet = [
        author ? `By ${author}` : null,
        w.first_publish_year ? String(w.first_publish_year) : null,
        genre.label,
      ]
        .filter(Boolean)
        .join(" · ");
      let coverUrl: string | null = null;
      if (w.cover_id) {
        coverUrl = `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg`;
      } else if (w.cover_edition_key) {
        coverUrl = `https://covers.openlibrary.org/b/olid/${w.cover_edition_key}-M.jpg`;
      } else if (iaId) {
        coverUrl = `https://archive.org/services/img/${iaId}`;
      }
      const pdfUrl = iaId
        ? `https://archive.org/download/${iaId}/${iaId}.pdf`
        : null;
      return {
        title: w.title,
        link,
        snippet,
        domain,
        coverUrl,
        pdfUrl,
        pageCount: null,
        source: "ol",
      };
    })
    .filter((r): r is EnrichedResult => r !== null);
}

async function searchInternetArchiveBySubject(genre: Genre): Promise<EnrichedResult[]> {
  const url = new URL(INTERNET_ARCHIVE_ENDPOINT);
  url.searchParams.set(
    "q",
    `subject:"${genre.archive}" AND mediatype:texts AND format:pdf`
  );
  url.searchParams.append("fl[]", "identifier");
  url.searchParams.append("fl[]", "title");
  url.searchParams.append("fl[]", "creator");
  url.searchParams.append("fl[]", "year");
  url.searchParams.append("fl[]", "subject");
  url.searchParams.append("fl[]", "format");
  url.searchParams.append("fl[]", "imagecount");
  url.searchParams.set("rows", "20");
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
      const formats = toArray(doc.format).map((f) => f.toLowerCase());
      const hasPdf = formats.some((f) => f.includes("pdf"));
      const snippet = [author ? `By ${author}` : null, year, genre.label]
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
