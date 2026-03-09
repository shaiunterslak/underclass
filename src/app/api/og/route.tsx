import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const pul = searchParams.get("pul") || "47";

  const pulNum = Number(pul);
  const pulColor =
    pulNum <= 30 ? "#22c55e" : pulNum <= 55 ? "#eab308" : pulNum <= 75 ? "#f97316" : "#ef4444";
  const pulLabel =
    pulNum <= 20 ? "ELITE TRACK" : pulNum <= 40 ? "ADAPTING" : pulNum <= 55 ? "AT RISK" : pulNum <= 75 ? "DANGER ZONE" : "PERMANENT UNDERCLASS";

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
          background: "#0a0e1a",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient blobs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234,179,8,0.06), transparent 70%)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            underclass
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.4)",
              marginTop: 16,
              marginBottom: 48,
            }}
          >
            {name
              ? `will ${name} survive the AI era?`
              : "will you survive the age of AI?"}
          </div>

          {/* PUL card — matching the actual app component */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 560,
              padding: "20px 28px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: pulColor,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {pulLabel}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  Permanent Underclass Likelihood
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: pulColor,
                    lineHeight: 1,
                  }}
                >
                  {pul}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color: "rgba(255,255,255,0.3)",
                    marginLeft: 2,
                  }}
                >
                  %
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: 10,
                borderRadius: 5,
                background: "rgba(255,255,255,0.06)",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${pul}%`,
                  height: 10,
                  borderRadius: 5,
                  background: pulColor,
                }}
              />
            </div>

            {/* Scale */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 9, color: "rgba(34,197,94,0.4)" }}>ELITE</span>
              <span style={{ fontSize: 9, color: "rgba(234,179,8,0.4)" }}>AT RISK</span>
              <span style={{ fontSize: 9, color: "rgba(239,68,68,0.4)" }}>UNDERCLASS</span>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Paste your LinkedIn → find out your score
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
