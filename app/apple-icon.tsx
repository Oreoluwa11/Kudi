import { ImageResponse } from "next/og";

// iOS home-screen icon. iOS rounds the corners itself, so the tile is square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#106b46" }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path
            d="M11 8.5v15M11 17l8.5-8.5M14 14.5l6 9"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="22.5" cy="16" r="1.75" fill="#ffffff" opacity="0.55" />
        </svg>
      </div>
    ),
    size,
  );
}
