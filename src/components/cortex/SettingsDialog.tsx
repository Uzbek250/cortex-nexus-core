import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Brain, Mic, Trash2, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Settings {
  memory_enabled: boolean;
  internet_enabled: boolean;
  voice_enabled: boolean;
  preferred_model: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (s: Settings) => void;
  onClearHistory: () => void;
}

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash · balanced default" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro · deeper reasoning" },
  { id: "openai/gpt-5", label: "GPT-5 · nuanced all-rounder" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini · faster" },
];

export function SettingsDialog({ open, onClose, settings, onChange, onClearHistory }: Props) {
  const save = async (next: Partial<Settings>) => {
    const merged = { ...settings, ...next };
    onChange(merged);
    await supabase.from("settings").update({ ...next, updated_at: new Date().toISOString() }).eq("id", 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <Overlay onClose={onClose}>
          <Panel title="Settings" onClose={onClose}>
            <Row
              icon={<Brain className="w-4 h-4" />}
              title="Long-term memory"
              desc="Cortex uses saved facts to personalize answers."
              checked={settings.memory_enabled}
              onChange={(v) => save({ memory_enabled: v })}
            />
            <Row
              icon={<Globe className="w-4 h-4" />}
              title="Internet access"
              desc="Coming soon. Will enable web search for factual questions."
              checked={settings.internet_enabled}
              onChange={(v) => save({ internet_enabled: v })}
              disabled
            />
            <Row
              icon={<Mic className="w-4 h-4" />}
              title="Voice"
              desc="Coming soon. Speech-to-text and voice responses."
              checked={settings.voice_enabled}
              onChange={(v) => save({ voice_enabled: v })}
              disabled
            />

            <div className="border-t border-border/40 my-4" />

            <div className="flex items-start gap-3 py-3">
              <Cpu className="w-4 h-4 mt-1 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">Preferred model</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cortex always picks the right tool for the job. This is the default.
                </p>
                <select
                  value={settings.preferred_model}
                  onChange={(e) => save({ preferred_model: e.target.value })}
                  className="mt-2 w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-background">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-border/40 my-4" />

            <button
              onClick={onClearHistory}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear all conversations
            </button>
          </Panel>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

function Row({
  icon, title, desc, checked, onChange, disabled,
}: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 py-3", disabled && "opacity-60")}>
      <div className="text-primary mt-1">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-10 h-5 rounded-full transition shrink-0 mt-1",
          checked ? "bg-primary" : "bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      {children}
    </motion.div>
  );
}

export function Panel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => e.stopPropagation()}
      className="glass-strong rounded-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-aurora">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </motion.div>
  );
}
