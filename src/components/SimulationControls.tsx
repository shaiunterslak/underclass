"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_SIMULATIONS } from "@/simulations/registry";

interface SimulationControlsProps {
  onSettingsChange: (settings: SimulationSettings) => void;
  onSteer?: (note: string) => void;
  settings: SimulationSettings;
}

export interface SimulationSettings {
  enabledSimulations: Set<string>;
  userNotes: string;
  soundEnabled: boolean;
}

export const DEFAULT_SETTINGS: SimulationSettings = {
  enabledSimulations: new Set(ALL_SIMULATIONS.map((s) => s.schema.toolName)),
  userNotes: "",
  soundEnabled: true,
};

const CATEGORIES = [
  { key: "core", label: "Core", description: "Story & choices" },
  { key: "social", label: "Social", description: "Twitter, Instagram" },
  { key: "messaging", label: "Messages", description: "iMessage, Slack, WhatsApp" },
  { key: "professional", label: "Professional", description: "LinkedIn, Email" },
  { key: "ai", label: "AI", description: "ChatGPT, Claude" },
  { key: "system", label: "System", description: "News alerts" },
] as const;

export function SimulationControls({ onSettingsChange, onSteer, settings }: SimulationControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSimulation = useCallback(
    (toolName: string) => {
      const next = new Set(settings.enabledSimulations);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      onSettingsChange({ ...settings, enabledSimulations: next });
    },
    [settings, onSettingsChange]
  );

  const toggleCategory = useCallback(
    (category: string) => {
      const catSims = ALL_SIMULATIONS.filter((s) => s.category === category);
      const allEnabled = catSims.every((s) => settings.enabledSimulations.has(s.schema.toolName));
      const next = new Set(settings.enabledSimulations);
      for (const sim of catSims) {
        if (allEnabled) {
          // Don't disable core
          if (sim.category !== "core") next.delete(sim.schema.toolName);
        } else {
          next.add(sim.schema.toolName);
        }
      }
      onSettingsChange({ ...settings, enabledSimulations: next });
    },
    [settings, onSettingsChange]
  );

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all cursor-pointer shadow-2xl"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white/80">Simulation Settings</h3>
              <p className="text-[11px] text-white/40 mt-0.5">Choose what appears in your timeline</p>
            </div>

            {/* Sound toggle */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[13px] text-white/70">🔊 Sound effects</span>
              </div>
              <button
                onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.soundEnabled ? "bg-cyan-500/60" : "bg-white/10"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.soundEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Simulation toggles by category */}
            <div className="px-4 py-3 space-y-3">
              {CATEGORIES.map((cat) => {
                const catSims = ALL_SIMULATIONS.filter((s) => s.category === cat.key);
                const allEnabled = catSims.every((s) => settings.enabledSimulations.has(s.schema.toolName));
                const isCore = cat.key === "core";

                return (
                  <div key={cat.key}>
                    <button
                      className="flex items-center justify-between w-full group cursor-pointer"
                      onClick={() => !isCore && toggleCategory(cat.key)}
                    >
                      <div>
                        <span className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-white/30 ml-2">{cat.description}</span>
                      </div>
                      {!isCore && (
                        <div
                          className={`w-4 h-4 rounded border transition-colors ${
                            allEnabled
                              ? "bg-cyan-500/60 border-cyan-400/60"
                              : "border-white/20"
                          }`}
                        >
                          {allEnabled && (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 8l3 3 7-7" />
                            </svg>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Individual toggles */}
                    <div className="mt-1.5 ml-2 flex flex-wrap gap-1.5">
                      {catSims.map((sim) => {
                        const enabled = settings.enabledSimulations.has(sim.schema.toolName);
                        return (
                          <button
                            key={sim.schema.toolName}
                            onClick={() => !isCore && toggleSimulation(sim.schema.toolName)}
                            disabled={isCore}
                            className={`text-[11px] px-2 py-1 rounded-full border transition-all cursor-pointer ${
                              enabled
                                ? "border-white/20 bg-white/10 text-white/70"
                                : "border-white/5 bg-transparent text-white/25"
                            } ${isCore ? "opacity-50 cursor-default" : "hover:border-white/30"}`}
                          >
                            {sim.icon} {sim.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* User notes / steering */}
            <div className="px-4 py-3 border-t border-white/5">
              <label className="text-[12px] text-white/50 font-medium block mb-1.5">
                Steer the story
              </label>
              <textarea
                value={settings.userNotes}
                onChange={(e) => onSettingsChange({ ...settings, userNotes: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && settings.userNotes.trim()) {
                    e.preventDefault();
                    onSteer?.(settings.userNotes.trim());
                  }
                }}
                placeholder="e.g. 'he pivots to a Spanish startup' or 'make it darker'"
                className="w-full h-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 resize-none outline-none focus:border-white/20 transition-colors"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-white/25">Enter to submit · Shift+Enter for newline</p>
                <button
                  onClick={() => {
                    if (settings.userNotes.trim()) onSteer?.(settings.userNotes.trim());
                  }}
                  disabled={!settings.userNotes.trim()}
                  className="text-[11px] px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400/80 border border-cyan-400/20 hover:bg-cyan-500/30 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
                >
                  Submit →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
