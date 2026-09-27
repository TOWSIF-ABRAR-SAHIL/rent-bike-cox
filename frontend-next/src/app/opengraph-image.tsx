import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 60%, #3d2b00 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 28,
              background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
            }}
          >
            🏍
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: "#ffffff" }}>
              Rent Bike
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#f59e0b",
                letterSpacing: 6,
              }}
            >
              COX&apos;S BAZAR
            </div>
          </div>
        </div>
        <div style={{ fontSize: 32, color: "#b4b4bc" }}>
          Bike • Car • Jeep Rental — from 200 TK/hr
        </div>
      </div>
    ),
    { ...size }
  );
}
