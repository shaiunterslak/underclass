"use client";

import { motion } from "framer-motion";
import { useState, useCallback } from "react";

interface Props {
  finalPul?: number;
  outcome?: "elite" | "survived" | "underclass";
  headline?: string;
  turningPoints?: string[];
  finalYear?: string;
  epitaph?: string;
  personName?: string;
  sessionShareUrl?: string;
}

function getOutcomeConfig(outcome: string, pul: number) {
  switch (outcome) {
    case "elite":
      return {
        color: "#22c55e",
        bg: "rgba(34,197,94,0.06)",
        border: "rgba(34,197,94,0.15)",
        badge: "ELITE",
        emoji: "🛡️",
        label: "You made it.",
      };
    case "survived":
      return {
        color: "#eab308",
        bg: "rgba(234,179,8,0.06)",
        border: "rgba(234,179,8,0.15)",
        badge: "SURVIVED",
        emoji: "⚡",
        label: "Barely.",
      };
    default:
      return {
        color: "#ef4444",
        bg: "rgba(239,68,68,0.06)",
        border: "rgba(239,68,68,0.15)",
        badge: "UNDERCLASS",
        emoji: "💀",
        label: "You didn't make it.",
      };
  }
}

export function GameOver({
  finalPul = 50,
  outcome = "survived",
  headline = "",
  turningPoints = [],
  finalYear = "2050",
  epitaph = "",
  personName = "",
  sessionShareUrl,
}: Props) {
  const pul = Math.max(0, Math.min(100, finalPul));
  const config = getOutcomeConfig(outcome, pul);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const ogImageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/og?name=${encodeURIComponent(personName)}&pul=${pul}&outcome=${outcome}`
    : "";

  // The session share URL has proper OG tags, so X will render the image card
  const linkToShare = sessionShareUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const shareText = outcome === "elite"
    ? `I survived the AI era. Final PUL: ${pul}%. ${headline} 🛡️\n\nWill you survive? →`
    : outcome === "survived"
      ? `I barely survived the AI era. PUL: ${pul}%. ${headline} ⚡\n\nFind out your score →`
      : `I didn't make it. PUL: ${pul}%. ${headline} 💀\n\nAre you next? →`;

  const handleShareX = useCallback(async () => {
    setSharing(true);
    try {
      // Try Web Share API first (mobile — supports images)
      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        try {
          const imgRes = await fetch(ogImageUrl);
          const blob = await imgRes.blob();
          const file = new File([blob], "underclass-result.png", { type: "image/png" });
          await navigator.share({
            text: shareText,
            url: linkToShare,
            files: [file],
          });
          return;
        } catch {
          // Fall through to X intent
        }
      }

      // Desktop: open X composer with session URL (has OG tags → X renders image card)
      const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(linkToShare)}`;
      window.open(tweetUrl, "_blank", "width=550,height=420");
    } finally {
      setSharing(false);
    }
  }, [ogImageUrl, shareText, linkToShare]);

  const handleCopyImage = useCallback(async () => {
    try {
      const imgRes = await fetch(ogImageUrl);
      const blob = await imgRes.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy link
      await navigator.clipboard.writeText(linkToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [ogImageUrl, linkToShare]);

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto my-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div
        className="relative rounded-3xl overflow-hidden border p-8 sm:p-12"
        style={{
          background: config.bg,
          borderColor: config.border,
        }}
      >
        {/* Glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${config.color}15 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <div className="relative z-10">
          {/* Badge */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          >
            <span className="text-4xl">{config.emoji}</span>
            <span
              className="text-sm uppercase tracking-[0.2em] font-black"
              style={{ color: config.color }}
            >
              {config.badge}
            </span>
            <span className="text-4xl">{config.emoji}</span>
          </motion.div>

          {/* Score */}
          <motion.div
            className="text-center mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span
              className="text-7xl sm:text-8xl font-mono font-black tabular-nums"
              style={{ color: config.color }}
            >
              {pul}
            </span>
            <span className="text-2xl text-white/30 ml-1">%</span>
            <p className="text-white/30 text-xs uppercase tracking-wider mt-1">
              Permanent Underclass Likelihood
            </p>
          </motion.div>

          {/* Label */}
          <motion.p
            className="text-center text-xl text-white/50 font-medium mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {config.label}
          </motion.p>

          {/* Headline */}
          <motion.p
            className="text-center text-lg text-white/80 font-semibold mb-8 max-w-lg mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {headline}
          </motion.p>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full relative"
                style={{ backgroundColor: config.color }}
                initial={{ width: "0%" }}
                animate={{ width: `${pul}%` }}
                transition={{ duration: 2, delay: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
              </motion.div>
            </div>
            <div className="flex justify-between mt-1 px-0.5">
              <span className="text-[9px] text-green-400/30">0% ELITE</span>
              <span className="text-[9px] text-red-400/30">100% UNDERCLASS</span>
            </div>
          </div>

          {/* Turning points */}
          {turningPoints.length > 0 && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <p className="text-[11px] uppercase tracking-wider text-white/25 font-semibold mb-3">
                Key Turning Points
              </p>
              <div className="space-y-2">
                {turningPoints.map((point, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.7 + i * 0.2 }}
                  >
                    <span className="text-white/15 text-xs mt-0.5">▸</span>
                    <span className="text-sm text-white/50 leading-snug">{point}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Epitaph */}
          {epitaph && (
            <motion.p
              className="text-center text-sm text-white/30 italic border-t border-white/5 pt-6 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
            >
              &ldquo;{epitaph}&rdquo;
            </motion.p>
          )}

          {/* Year */}
          <motion.p
            className="text-center text-xs text-white/15 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.7 }}
          >
            Simulation ended: {finalYear}
          </motion.p>

          {/* Share buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3 }}
          >
            <button
              onClick={handleShareX}
              disabled={sharing}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>
            <button
              onClick={handleCopyImage}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white/70 font-medium text-sm hover:bg-white/15 transition-all cursor-pointer border border-white/10"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy image
                </>
              )}
            </button>
          </motion.div>

          {/* Play again */}
          <motion.div
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.3 }}
          >
            <a
              href="/"
              className="text-xs text-white/20 hover:text-white/40 transition-colors underline"
            >
              Try another person →
            </a>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
