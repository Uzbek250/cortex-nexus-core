import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CortexLogo } from "./CortexLogo";

const LINES = [
  "Initializing neural core…",
  "Calibrating reasoning lattice…",
  "Loading long-term memory…",
  "Cortex is online.",
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 500 + i * 550));
    });
    timers.push(setTimeout(onDone, 500 + LINES.length * 550 + 700));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute inset-0 blur-3xl rounded-full bg-primary/30 animate-pulse-glow" />
        <CortexLogo size={140} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-10 text-4xl font-light tracking-[0.4em] text-aurora"
      >
        CORTEX
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 text-xs tracking-[0.3em] text-muted-foreground uppercase"
      >
        Personal AI Operating System
      </motion.p>

      <div className="mt-12 h-24 w-80 text-center">
        <AnimatePresence mode="popLayout">
          {LINES.slice(0, step).map((line, i) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: i === step - 1 ? 1 : 0.4, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm text-muted-foreground font-mono"
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
