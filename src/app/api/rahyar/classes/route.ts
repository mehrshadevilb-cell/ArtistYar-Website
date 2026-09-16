import { NextResponse } from "next/server";
import { fetchClasses, hasBackend } from "@/lib/rahyar-api";

export async function GET() {
  if (!hasBackend()) {
    return NextResponse.json({
      source: "demo",
      items: [
        { id: 1, name: "میکس", description: "کلاس یک‌به‌یک", is_active: true },
        { id: 2, name: "تنظیم", description: "کلاس یک‌به‌یک", is_active: true },
        { id: 3, name: "پیانو", description: "کلاس یک‌به‌یک", is_active: true },
      ],
    });
  }
  try {
    const items = await fetchClasses();
    return NextResponse.json({ source: "rahyar", items });
  } catch {
    return NextResponse.json(
      { source: "error", error: "کلاس‌ها موقتاً در دسترس نیستند.", items: [] },
      { status: 502 },
    );
  }
}
