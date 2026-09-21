export const dynamic = "force-static";

export function GET() {
  return new Response("43325481", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
