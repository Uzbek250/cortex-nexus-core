import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type CortexPhase =
  | "idle"
  | "analyzing"
  | "routing"
  | "searching"
  | "generating"
  | "refining"
  | "done";

const PHASE_LABEL: Record<CortexPhase, string> = {
  idle: "Standby",
  analyzing: "Analyzing intent",
  routing: "Routing model",
  searching: "Searching",
  generating: "Generating",
  refining: "Reviewing",
  done: "Ready",
};

const MODEL_SHORT: Record<string, string> = {
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 mini",
  "openai/gpt-5-nano": "GPT-5 nano",
  "openai/gpt-5.2": "GPT-5.2",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-2.5-flash-lite": "Gemini 2.5 Lite",
};

export function BrainViz({
  phase,
  model,
}: {
  phase: CortexPhase;
  model: string | null;
}) {
  const active = phase !== "idle" && phase !== "done";
  const modelLabel = model ? MODEL_SHORT[model] ?? model : "Adaptive";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-9 h-9 shrink-0">
        {/* Outer pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/30"
          animate={active ? { scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] } : { opacity: 0.3 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Mid ring */}
        <motion.div
          className="absolute inset-1 rounded-full border border-accent/40"
          animate={active ? { rotate: 360 } : {}}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ borderStyle: "dashed" }}
        />
        {/* Core */}
        <div className="absolute inset-[10px] rounded-full bg-gradient-to-br from-primary to-accent" />
        <motion.div
          className="absolute inset-[10px] rounded-full bg-gradient-to-br from-primary to-accent blur-md"
          animate={active ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.4 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orbiting nodes (visible during activity) */}
        {active && (
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent shadow-[0_0_6px_currentColor]" />
          </motion.div>
        )}
      </div>

      <div className="flex flex-col leading-tight min-w-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "text-[11px] tracking-widest uppercase",
              active ? "text-primary" : "text-muted-foreground/70",
            )}
          >
            {PHASE_LABEL[phase]}
          </motion.span>
        </AnimatePresence>
        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[140px]">
          {modelLabel}
        </span>
      </div>
    </div>
  );
}