"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);

    // Extract LinkedIn username from URL or use as-is
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

      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 -mt-20">
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
      </div>
    </main>
  );
}
