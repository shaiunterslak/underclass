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
  const handle = searchParams.get("handle") || "";
  const [isResearching, setIsResearching] = useState(true);
  const [researchStatus, setResearchStatus] = useState("Researching...");
  const [choiceDisabled, setChoiceDisabled] = useState(false);
  const [personName, setPersonName] = useState("");
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [appliedNotes, setAppliedNotes] = useState<string[]>([]);
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
    if ((!url && !handle) || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const loadingMessages = [
      "Looking up profile...",
      "Seeing if you're cooked...",
      "Checking your LinkedIn...",
      "Calculating future earnings...",
      "Asking AI if you'll make it...",
      "Scanning for red flags...",
      "Evaluating your vibe...",
      "Cross-referencing with the algorithm...",
      "Running the simulation...",
      "Determining underclass probability...",
    ];

    const research = async () => {
      try {
        setResearchStatus(handle ? `Searching for ${handle}...` : loadingMessages[0]);

        // Cycle through loading messages
        let msgIdx = 1;
        const msgInterval = setInterval(() => {
          setResearchStatus(loadingMessages[msgIdx % loadingMessages.length]);
          msgIdx++;
        }, 2500);

        const body = handle ? { handle } : { url };
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        clearInterval(msgInterval);
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
      console.log("[handleChoice] clicked:", choice, "status:", status, "choiceDisabled:", choiceDisabled);
      if (choiceDisabled) return;
      if (status !== "ready") {
        console.log("[handleChoice] blocked — status is:", status);
        return;
      }
      setChoiceDisabled(true);
      const notes = settings.userNotes ? `\n\nUSER DIRECTION: ${settings.userNotes}` : "";
      if (settings.userNotes) {
        setAppliedNotes((prev) => [...prev, settings.userNotes]);
      }
      sendMessage({
        text: `I chose: "${choice}". Continue the simulation from where we left off — advance the timeline, show consequences of this choice, then present another choice after 2-3 chapters. Use varied simulation types!${notes}\n\nPROFILE DATA:\n${profileRef.current}`,
      });
      setTimeout(() => setChoiceDisabled(false), 5000);

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
    [sendMessage, settings.userNotes, status, choiceDisabled]
  );

  // Auto-continue: when streaming finishes, either auto-pick a choice or continue
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted";
    const nowReady = status === "ready";
    prevStatusRef.current = status;

    if (!wasStreaming || !nowReady || isResearching) return;

    // Find the last tool in the last assistant message
    const lastMsg = messages[messages.length - 1];
    let lastToolName: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastToolArgs: any = null;
    if (lastMsg?.role === "assistant") {
      const parts = lastMsg.parts || [];
      for (let i = parts.length - 1; i >= 0; i--) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = parts[i] as any;
        const tn = p.toolName || (typeof p.type === "string" && p.type.startsWith("tool-") ? p.type.slice(5) : null);
        if (tn) {
          lastToolName = tn;
          lastToolArgs = p.input || {};
          break;
        }
      }
    }

    if (lastToolName === "showChoice") {
      // Wait for user to pick — don't auto-continue
      return;
    }

    // No choice at end — auto-continue after a short pause
    const timer = setTimeout(() => {
      const notes = settings.userNotes ? `\n\nUSER DIRECTION: ${settings.userNotes}` : "";
      sendMessage({
        text: `Continue the simulation — advance the timeline further, show more consequences and new developments. Keep the PUL updating. End with another choice.${notes}\n\nPROFILE DATA:\n${profileRef.current}`,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [status, messages, isResearching, sendMessage, settings.userNotes, handleChoice]);

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
    // Don't disable during streaming — only after user clicks
    const extraProps = toolName === "showChoice"
      ? { onChoice: handleChoice, disabled: choiceDisabled }
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
                className="flex flex-col items-center justify-center min-h-[80vh] gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
              >
                {/* Status text */}
                <div className="text-center">
                  <Shimmer as="p" className="text-lg font-medium mb-3" duration={2.5}>
                    {researchStatus}
                  </Shimmer>
                  <p className="text-white/20 text-sm max-w-xs mx-auto leading-relaxed">
                    Analyzing career trajectory and modeling AI disruption scenarios
                  </p>
                </div>

                {/* Animated skeleton cards */}
                <div className="w-full max-w-md space-y-3 mt-4">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="rounded-xl overflow-hidden"
                      initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.4, duration: 0.5 }}
                    >
                      <div className={`h-16 rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 ${i % 2 === 0 ? "ml-0 mr-auto max-w-[85%]" : "ml-auto mr-0 max-w-[70%]"}`}>
                        <motion.div
                          className="h-2.5 rounded-full bg-white/[0.06] mb-2"
                          style={{ width: `${60 + i * 15}%` }}
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        />
                        <motion.div
                          className="h-2 rounded-full bg-white/[0.04]"
                          style={{ width: `${40 + i * 10}%` }}
                          animate={{ opacity: [0.2, 0.4, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 + 0.3 }}
                        />
                      </div>
                    </motion.div>
                  ))}

                  {/* Skeleton PUL bar */}
                  <motion.div
                    className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2, duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <motion.div
                        className="h-2 w-32 rounded-full bg-white/[0.06]"
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.div
                        className="h-5 w-10 rounded bg-white/[0.06]"
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-cyan-400/10"
                        animate={{ width: ["0%", "45%", "30%", "50%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                </div>
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
                let noteIdx = 0;
                messages.forEach((message, messageIndex) => {
                  // Render user steering notes in the timeline
                  if (message.role === "user" && messageIndex > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const text = (message as any).content || (message.parts || []).map((p: any) => p.text || "").join("");
                    const dirMatch = typeof text === "string" ? text.match(/USER DIRECTION: (.+?)(\n|$)/) : null;
                    if (dirMatch) {
                      elements.push(
                        <motion.div
                          key={`note-${messageIndex}`}
                          className="flex items-center gap-2 my-3 mx-auto max-w-md"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="flex-1 h-px bg-white/5" />
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-[10px] text-white/25">🎯</span>
                            <span className="text-[11px] text-white/30 italic">{dirMatch[1]}</span>
                          </div>
                          <div className="flex-1 h-px bg-white/5" />
                        </motion.div>
                      );
                    }
                    return;
                  }
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

      {/* Sound toggle — top right, always visible */}
      <motion.button
        className="fixed top-5 right-5 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all cursor-pointer shadow-2xl"
        onClick={() => {
          const next = !soundOn;
          setSoundOn(next);
          setSoundEnabled(next);
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        title={soundOn ? "Mute sounds" : "Enable sounds"}
      >
        {soundOn ? (
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </motion.button>

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
