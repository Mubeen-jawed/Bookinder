import { NextResponse } from "next/server";
import { searchBookPDFs, type SourceTier } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const tierParam = searchParams.get("tier");
  const tier: SourceTier = tierParam === "secondary" ? "secondary" : "primary";

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter 'q'." },
      { status: 400 }
    );
  }

  try {
    const { results, suggestion } = await searchBookPDFs(query, tier);
    return NextResponse.json({ results, suggestion });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while searching.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
