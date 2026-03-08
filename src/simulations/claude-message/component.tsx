"use client";

import { motion } from "framer-motion";

interface Props {
  message?: string;
  userQuery?: string;
  timeAgo?: string;
}

// Anthropic logo SVG — the ⊕ / starburst mark
function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M32.73 0H26.l-13.27 32h6.73L32.73 0ZM13.27 0H6.54L0 15.28h6.73L13.27 0ZM19.46 19.72 16.13 28h6.73l3.33-8.28h-6.73Z" />
    </svg>
  );
}

export function ClaudeMessage({ message = "", userQuery, timeAgo = "" }: Props) {
  return (
    <motion.div
      className="bg-[#3d3024] rounded-2xl max-w-sm w-full font-sans overflow-hidden border border-[#5a4634]"
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* User query bar */}
      {userQuery && (
        <div className="bg-[#4a3a2a] px-4 py-3 border-b border-[#5a4634]">
          <p className="text-[14px] text-[#e8d5c0] leading-snug">{userQuery}</p>
        </div>
      )}

      {/* Claude response */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Anthropic logo in circle */}
          <div className="w-8 h-8 rounded-full bg-[#c96442] shrink-0 flex items-center justify-center">
            <AnthropicLogo className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[14px] font-semibold text-[#f0e0d0]">Claude</span>
              <span className="text-[12px] text-[#a08868]">{timeAgo}</span>
            </div>
            <p className="text-[14.5px] text-[#e8d5c0] leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
