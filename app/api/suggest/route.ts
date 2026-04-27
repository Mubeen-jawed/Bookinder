import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GoogleBooksItem = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
  };
};

type GoogleBooksResponse = {
  items?: GoogleBooksItem[];
};

export type Suggestion = {
  title: string;
  author: string | null;
  coverUrl: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("printType", "books");
  url.searchParams.set("fields", "items(volumeInfo(title,authors,imageLinks))");

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ suggestions: [] });

    const data = (await response.json()) as GoogleBooksResponse;
    const seen = new Set<string>();
    const suggestions: Suggestion[] = [];

    for (const item of data.items ?? []) {
      const info = item.volumeInfo;
      const title = info?.title?.trim();
      if (!title) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const rawCover =
        info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail ?? null;
      // Google returns http URLs that browsers will block on https sites
      const coverUrl = rawCover ? rawCover.replace(/^http:/, "https:") : null;

      suggestions.push({
        title,
        author: info?.authors?.[0] ?? null,
        coverUrl,
      });
      if (suggestions.length >= 6) break;
    }

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
