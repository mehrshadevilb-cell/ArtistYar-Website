import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ArtistYar؛ آکادمی راه‌یار برای آموزش تنظیم، میکس و مسترینگ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        dir="rtl"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "linear-gradient(135deg, #10100e 0%, #1c1914 58%, #6b4d18 100%)",
          color: "#f7f1e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 5, color: "#d3a94b" }}>ARTISTYAR</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 950 }}>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.25 }}>
            آموزش تنظیم، میکس و مسترینگ
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#e6d7b4" }}>
            با مسیر پروژه‌محور و دستیار هوشمند راه‌یار AI
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#c8c0b0" }}>
          <span>مهرشاد بنائی · آکادمی راه‌یار</span>
          <span>artistyaar.ir</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
