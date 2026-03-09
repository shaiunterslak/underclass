"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface RecentSession {
  id: string;
  personName: string;
  finalPul: number | null;
}

function getOutcomeInfo(pul: number | null) {
  if (pul === null) return { label: "simulating...", color: "text-white/30", bg: "bg-white/5 border-white/10" };
  if (pul <= 20) return { label: "ELITE", color: "text-green-400", bg: "bg-green-400/5 border-green-400/15" };
  if (pul <= 60) return { label: "SURVIVED", color: "text-yellow-400", bg: "bg-yellow-400/5 border-yellow-400/15" };
  return { label: "UNDERCLASS", color: "text-red-400", bg: "bg-red-400/5 border-red-400/15" };
}

function Marquee({ sessions }: { sessions: RecentSession[] }) {
  if (sessions.length === 0) return null;

  // Repeat list enough to fill viewport, then double for seamless scroll
  const minItems = Math.max(2, Math.ceil(20 / sessions.length));
  const baseItems: RecentSession[] = [];
  for (let i = 0; i < minItems; i++) baseItems.push(...sessions);
  // Double for seamless loop (scroll first half, then reset)
  const items = [...baseItems, ...baseItems];

  return (
    <div className="w-full overflow-hidden mt-10 max-w-4xl mx-auto mask-fade">
      <motion.div
        className="flex gap-3 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: baseItems.length * 2.5,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {items.map((session, i) => {
          const info = getOutcomeInfo(session.finalPul);
          return (
            <a
              key={`${session.id}-${i}`}
              href={`/s/${session.id}`}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-nowrap transition-all hover:scale-105 ${info.bg}`}
            >
              <span className="text-[13px] text-white/60">{session.personName}</span>
              {session.finalPul !== null && (
                <>
                  <span className={`text-[11px] font-mono font-bold ${info.color}`}>
                    {session.finalPul}%
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider font-bold ${info.color}`}>
                    {info.label}
                  </span>
                </>
              )}
            </a>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const router = useRouter();

  // Fetch recent sessions
  useEffect(() => {
    fetch("/api/recent")
      .then((r) => r.json())
      .then((data) => setRecentSessions(data.sessions || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);

    let linkedinUrl = url.trim();
    if (!linkedinUrl.startsWith("http")) {
      linkedinUrl = `https://www.linkedin.com/in/${linkedinUrl.replace(/^\/+/, "")}`;
    }

    router.push(`/simulate?url=${encodeURIComponent(linkedinUrl)}`);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/hero-bg.jpg)" }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 -mt-10">
        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-4 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          underclass
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-white/70 text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        >
          will you survive the age of AI?
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <div className="glass rounded-full flex items-center p-1.5 pl-6 transition-all duration-300 focus-within:border-white/25">
            <span className="text-white/40 text-sm mr-1 hidden sm:inline whitespace-nowrap">
              linkedin.com/in/
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="paste linkedin url or username"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30 py-3"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition-all duration-200 shrink-0"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </motion.form>

        {/* Recent sessions marquee */}
        <motion.div
          className="w-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <Marquee sessions={recentSessions} />
        </motion.div>
      </div>
    </main>
  );
}
