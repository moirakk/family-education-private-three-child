import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%"
        }}
      >
        <div
          style={{
            alignItems: "center",
            border: "16px solid rgba(255,255,255,0.26)",
            borderRadius: "104px",
            display: "flex",
            flexDirection: "column",
            height: "360px",
            justifyContent: "center",
            width: "360px"
          }}
        >
          <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: 4 }}>Y</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 10 }}>EDU</div>
        </div>
      </div>
    ),
    size
  );
}
