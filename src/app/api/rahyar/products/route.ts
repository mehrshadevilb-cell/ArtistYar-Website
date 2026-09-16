import { NextResponse } from "next/server";
import { fetchProducts, hasBackend } from "@/lib/rahyar-api";
import { courses } from "@/data/courses";

export async function GET() {
  if (!hasBackend()) {
    return NextResponse.json({
      source: "demo",
      items: courses.map((c, i) => ({
        id: i + 1,
        title: c.title,
        description: c.summary,
        price: 0,
        is_active: true,
        format: c.format,
        tag: c.tag,
      })),
    });
  }
  try {
    const items = await fetchProducts();
    return NextResponse.json({ source: "rahyar", items });
  } catch (e) {
    return NextResponse.json(
      { source: "error", error: String(e), items: [] },
      { status: 502 },
    );
  }
}
