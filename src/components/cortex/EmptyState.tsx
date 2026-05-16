import { motion } from "framer-motion";
import { CortexLogo } from "./CortexLogo";
import { BookOpen, Code2, Sparkles, Search, Scale } from "lucide-react";

const SUGGESTIONS = [
  { icon: BookOpen, label: "Explain a concept", q: "Explain quantum entanglement like I have a physics background.", color: "text-emerald-300" },
  { icon: Code2, label: "Build something", q: "Help me design a real-time chat app architecture.", color: "text-cyan-300" },
  { icon: Sparkles, label: "Brainstorm", q: "Give me 5 unconventional startup ideas in AI tooling.", color: "text-fuchsia-300" },
  { icon: Scale, label: "Pressure-test an idea", q: "I want to drop out of college to start a company. Challenge my thinking.", color: "text-amber-300" },
];

export function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative animate-float"
      >
        <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse-glow" />
        <CortexLogo size={96} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 text-3xl font-light tracking-wide"
      >
        How can I help, <span className="text-aurora">today</span>?
      </motion.h2>
      <p className="mt-2 text-sm text-muted-foreground">
        I'll adapt my mode automatically. Truthful, direct, never flattering.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 w-full max-w-2xl">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            onClick={() => onPick(s.q)}
            className="group glass rounded-2xl p-4 text-left hover:bg-white/[0.04] hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 group-hover:text-foreground/80 transition">
              {s.q}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
