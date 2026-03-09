"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ALL_SIMULATIONS } from "@/simulations/registry";
import type { Simulation } from "@/simulations/types";
import { viralizeUrls } from "@/lib/viral";

const TOOL_MAP = new Map<string, Simulation>(
  ALL_SIMULATIONS.map((s) => [s.schema.toolName, s])
);

interface SessionData {
  id: string;
  personName: string;
  linkedinUrl: string;
  messages: Array<{
    role: string;
    parts?: Array<{
      type: string;
      toolName?: string;
      input?: Record<string, unknown>;
      text?: string;
      toolInvocation?: {
        toolName: string;
        args?: Record<string, unknown>;
        input?: Record<string, unknown>;
      };
    }>;
  }>;
  finalPul?: number;
  createdAt: string;
}

export default function SharedSessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sessions?id=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Session not found");
        setLoading(false);
      });
  }, [id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getToolInfo = (part: any): { toolName: string; args: any } | null => {
    if (part.type === "dynamic-tool" && part.toolName) {
      return { toolName: part.toolName, args: part.input || {} };
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      return { toolName: part.type.slice(5), args: part.input || {} };
    }
    if (part.type === "tool-invocation" && part.toolInvocation) {
      return { toolName: part.toolInvocation.toolName, args: part.toolInvocation.args || part.toolInvocation.input || {} };
    }
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTool = (toolName: string, args: any, key: string) => {
    const sim = TOOL_MAP.get(toolName);
    if (!sim) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeArgs: any = { ...(args || {}) };
    const Component = sim.component;

    // Viralize URLs
    const textFields = ["content", "message", "headline", "narrative", "subject", "preview"];
    for (const field of textFields) {
      if (typeof safeArgs[field] === "string") {
        safeArgs[field] = viralizeUrls(safeArgs[field]);
      }
    }

    // Don't render choices in read-only mode
    if (toolName === "showChoice") {
      return (
        <div key={key} className="my-8 py-4 border-t border-white/10">
          <p className="text-sm text-white/40 italic text-center">{safeArgs.prompt}</p>
          <div className="flex gap-3 justify-center mt-3">
            <span className="text-xs text-cyan-400/50 px-3 py-1.5 rounded-lg border border-white/10">
              {safeArgs.optionA}
            </span>
            <span className="text-xs text-purple-400/50 px-3 py-1.5 rounded-lg border border-white/10">
              {safeArgs.optionB}
            </span>
          </div>
        </div>
      );
    }

    const layoutClass =
      sim.layout === "inline-right" ? "flex justify-end mb-4" :
      sim.layout === "inline-left" ? "mb-2" :
      sim.layout === "inline-center" ? "" :
      sim.layout === "fullscreen" ? "w-full mb-6" :
      "mb-4";

    return (
      <ErrorBoundary key={key}>
        <div className={layoutClass}>
          <Component {...safeArgs} />
        </div>
      </ErrorBoundary>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="w-8 h-8 border-2 border-t-cyan-400/60 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] gap-4">
        <p className="text-white/50 text-lg">Session not found</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 rounded-full bg-white/10 text-white/70 text-sm hover:bg-white/15 cursor-pointer"
        >
          Simulate your own future →
        </button>
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  session.messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    (message.parts || []).forEach((part, partIndex) => {
      const toolInfo = getToolInfo(part);
      if (toolInfo) {
        const el = renderTool(toolInfo.toolName, toolInfo.args, `tool-${messageIndex}-${partIndex}`);
        if (el) elements.push(el);
      } else if (part.type === "text" && part.text?.trim()) {
        elements.push(
          <p key={`text-${messageIndex}-${partIndex}`} className="text-white/70 text-base leading-relaxed mb-4">
            {part.text}
          </p>
        );
      }
    });
  });

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/hero-bg.jpg)" }} />
      <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      <div ref={scrollRef} className="relative z-10 min-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-white/30 text-sm mb-1">
              {session.personName}&apos;s future simulation
            </p>
            {session.finalPul !== undefined && session.finalPul !== null && (
              <p className="text-white/40 text-xs">
                Final PUL: <span className={session.finalPul <= 30 ? "text-green-400" : session.finalPul <= 60 ? "text-yellow-400" : "text-red-400"}>
                  {session.finalPul}%
                </span>
              </p>
            )}
          </motion.div>

          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-2">{elements}</div>
            </motion.div>
          </AnimatePresence>

          {/* CTA at the bottom */}
          <motion.div
            className="mt-16 mb-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-white/40 text-sm mb-4">Want to see your own future?</p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 rounded-full bg-white/10 backdrop-blur border border-white/15 text-white/80 text-base font-medium hover:bg-white/15 transition-all cursor-pointer"
            >
              Simulate your future →
            </button>
          </motion.div>
        </div>
        <div className="h-32" />
      </div>
    </main>
  );
}
