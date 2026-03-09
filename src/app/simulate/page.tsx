"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Shimmer } from "@/components/Shimmer";
import { SimulationControls, DEFAULT_SETTINGS, type SimulationSettings } from "@/components/SimulationControls";
import { ALL_SIMULATIONS } from "@/simulations/registry";
import type { Simulation } from "@/simulations/types";
import { playSound, setSoundEnabled } from "@/lib/sounds";
import { viralizeUrls } from "@/lib/viral";

// Build lookup maps from the simulation registry
const TOOL_MAP = new Map<string, Simulation>(
  ALL_SIMULATIONS.map((s) => [s.schema.toolName, s])
);

function SimulationContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const [isResearching, setIsResearching] = useState(true);
  const [researchStatus, setResearchStatus] = useState("Researching...");
  const [choiceDisabled, setChoiceDisabled] = useState(false);
  const [personName, setPersonName] = useState("");
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const profileRef = useRef("");

  const transportRef = useRef(
    new DefaultChatTransport({ api: "/api/simulate" })
  );

  const { messages, sendMessage, status } = useChat({
    transport: transportRef.current,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Research the person and start simulation
  useEffect(() => {
    if (!url || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const research = async () => {
      try {
        setResearchStatus("Looking up profile...");
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        setPersonName(data.name || "");
        const profileStr = JSON.stringify(data, null, 2);
        profileRef.current = profileStr;

        setResearchStatus("Simulating your future...");
        await new Promise((r) => setTimeout(r, 600));
        setIsResearching(false);

        sendMessage({
          text: `Generate the first chapters of my future simulation. Use a variety of simulation types — tweets, iMessages, Slack, LinkedIn, news alerts, AI conversations. Mix it up!\n\nPROFILE DATA:\n${profileStr}`,
        });
      } catch {
        setResearchStatus("Could not research this profile. Try another URL.");
      }
    };

    research();
  }, [url, sendMessage]);

  const handleShare = useCallback(async () => {
    if (isSaving || shareUrl) return;
    setIsSaving(true);
    try {
      // Extract last PUL score from messages
      let lastPul: number | undefined;
      for (const msg of [...messages].reverse()) {
        if (msg.role !== "assistant") continue;
        for (const part of [...(msg.parts || [])].reverse()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;
          if (p.type?.startsWith?.("tool-showPULUpdate") || p.toolName === "showPULUpdate") {
            lastPul = p.input?.score;
            break;
          }
        }
        if (lastPul !== undefined) break;
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: url,
          personName,
          profileData: profileRef.current ? JSON.parse(profileRef.current) : {},
          messages: messages.map((m) => ({ role: m.role, parts: m.parts })),
          finalPul: lastPul,
        }),
      });

      if (res.ok) {
        const { shareUrl: newUrl } = await res.json();
        setShareUrl(newUrl);
        // Copy to clipboard
        await navigator.clipboard.writeText(newUrl).catch(() => {});
      }
    } catch (e) {
      console.error("Share error:", e);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, shareUrl, messages, url, personName]);

  const handleSettings = useCallback((newSettings: SimulationSettings) => {
    setSettings(newSettings);
    setSoundEnabled(newSettings.soundEnabled);
  }, []);

  const handleChoice = useCallback(
    (choice: string) => {
      setChoiceDisabled(true);
      const notes = settings.userNotes ? `\n\nUSER DIRECTION: ${settings.userNotes}` : "";
      sendMessage({
        text: `I chose: "${choice}". Continue the simulation from where we left off — advance the timeline, show consequences of this choice, then present another choice after 2-3 chapters. Use varied simulation types!${notes}\n\nPROFILE DATA:\n${profileRef.current}`,
      });
      setTimeout(() => setChoiceDisabled(false), 3000);

      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 300);
    },
    [sendMessage, settings.userNotes]
  );

  // Track which tools have already played sounds
  const playedSoundsRef = useRef(new Set<string>());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTool = useCallback((toolName: string, args: any, key: string) => {
    const sim = TOOL_MAP.get(toolName);
    if (!sim) return null;

    // Play sound once per tool invocation
    if (!playedSoundsRef.current.has(key)) {
      playedSoundsRef.current.add(key);
      playSound(toolName);
    }

    const safeArgs = { ...(args || {}) };
    const Component = sim.component;

    // Viralize URLs in text-heavy fields
    const textFields = ["content", "message", "headline", "narrative", "subject", "preview"];
    for (const field of textFields) {
      if (typeof safeArgs[field] === "string") {
        safeArgs[field] = viralizeUrls(safeArgs[field]);
      }
    }

    // Inject onChoice + disabled for the choice component
    const extraProps = toolName === "showChoice"
      ? { onChoice: handleChoice, disabled: choiceDisabled || isStreaming }
      : {};

    // Inject personName fallback for chapters
    if (toolName === "showChapter" && !safeArgs.personName) {
      safeArgs.personName = personName;
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
          <Component {...safeArgs} {...extraProps} />
        </div>
      </ErrorBoundary>
    );
  }, [handleChoice, choiceDisabled, isStreaming, personName]);

  // Extract tool name from part type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getToolInfo = (part: any): { toolName: string; args: any } | null => {
    if (part.state === "input-streaming") return null;

    if (part.type === "dynamic-tool" && part.toolName) {
      return { toolName: part.toolName, args: part.input || {} };
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const toolName = part.type.slice(5);
      return { toolName, args: part.input || {} };
    }
    if (part.type === "tool-invocation" && part.toolInvocation) {
      return { toolName: part.toolInvocation.toolName, args: part.toolInvocation.args || part.toolInvocation.input || {} };
    }
    return null;
  };

  return (
    <main className="relative min-h-screen">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/hero-bg.jpg)" }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      <div ref={scrollRef} className="relative z-10 min-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <AnimatePresence>
            {isResearching && (
              <motion.div
                className="flex flex-col items-center justify-center min-h-[60vh]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
                  <div className="absolute inset-0 w-16 h-16 border-2 border-t-cyan-400/60 rounded-full animate-spin" />
                </div>
                <p className="text-white/60 text-lg">{researchStatus}</p>
                <p className="text-white/30 text-sm mt-2 max-w-md text-center">
                  Analyzing career trajectory and modeling AI disruption
                  scenarios...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!isResearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {(() => {
                const elements: React.ReactNode[] = [];
                let lastChoiceIndex = -1;
                let globalIndex = 0;

                // First pass: find the last showChoice
                messages.forEach((message) => {
                  if (message.role !== "assistant") return;
                  (message.parts || []).forEach((part) => {
                    const toolInfo = getToolInfo(part);
                    if (toolInfo?.toolName === "showChoice") {
                      lastChoiceIndex = globalIndex;
                    }
                    globalIndex++;
                  });
                });

                // Second pass: render everything
                let idx = 0;
                messages.forEach((message, messageIndex) => {
                  if (message.role !== "assistant") return;
                  (message.parts || []).forEach((part, partIndex) => {
                    const currentIdx = idx++;
                    const toolInfo = getToolInfo(part);
                    if (toolInfo) {
                      // Only render the last choice (skip earlier duplicates)
                      if (toolInfo.toolName === "showChoice" && currentIdx !== lastChoiceIndex) {
                        return;
                      }
                      const el = renderTool(
                        toolInfo.toolName,
                        toolInfo.args,
                        `tool-${messageIndex}-${partIndex}`
                      );
                      if (el) elements.push(el);
                      return;
                    }
                    if (part.type === "text") {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const text = (part as any).text;
                      if (!text || text.trim().length === 0) return;
                      elements.push(
                        <motion.p
                          key={`text-${messageIndex}-${partIndex}`}
                          className="text-white/70 text-base leading-relaxed mb-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {text}
                        </motion.p>
                      );
                    }
                  });
                });

                return <div className="space-y-2">{elements}</div>;
              })()}

              {isStreaming && (
                <motion.div
                  className="mt-8 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Shimmer
                    as="span"
                    className="text-sm font-mono tracking-wider"
                    duration={2}
                    spread={3}
                  >
                    simulating the future...
                  </Shimmer>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
        <div className="h-32" />
      </div>

      {/* Floating controls */}
      {!isResearching && (
        <>
          {/* Share button */}
          <motion.button
            className="fixed bottom-6 right-20 z-50 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center gap-2 px-4 text-white/60 hover:text-white hover:bg-white/15 transition-all cursor-pointer shadow-2xl"
            onClick={handleShare}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isSaving}
          >
            {shareUrl ? (
              <>
                <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-xs text-green-400">Copied!</span>
              </>
            ) : isSaving ? (
              <span className="text-xs">Saving...</span>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span className="text-xs">Share</span>
              </>
            )}
          </motion.button>

          <SimulationControls settings={settings} onSettingsChange={handleSettings} />
        </>
      )}
    </main>
  );
}

export default function SimulatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
          <div className="w-8 h-8 border-2 border-t-cyan-400/60 border-white/10 rounded-full animate-spin" />
        </div>
      }
    >
      <SimulationContent />
    </Suspense>
  );
}
