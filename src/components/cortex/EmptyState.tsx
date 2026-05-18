import { motion } from "framer-motion";
import { CortexLogo } from "./CortexLogo";
import { BookOpen, Code2, Sparkles, Scale } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

const SUGGESTIONS: { icon: typeof BookOpen; label: TKey; q: TKey; color: string }[] = [
  { icon: BookOpen, label: "empty.s1", q: "empty.s1q", color: "text-emerald-300" },
  { icon: Code2,    label: "empty.s2", q: "empty.s2q", color: "text-cyan-300" },
  { icon: Sparkles, label: "empty.s3", q: "empty.s3q", color: "text-fuchsia-300" },
  { icon: Scale,    label: "empty.s4", q: "empty.s4q", color: "text-amber-300" },
];

export function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6">
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
        className="mt-6 sm:mt-8 text-2xl sm:text-3xl font-light tracking-wide text-center"
      >
        {t("empty.title")} <span className="text-aurora">{t("empty.titleAccent")}</span>?
      </motion.h2>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground text-center max-w-md">
        {t("empty.subtitle")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 sm:mt-10 w-full max-w-2xl">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            onClick={() => onPick(t(s.q))}
            className="group glass rounded-2xl p-4 text-left hover:bg-white/[0.04] hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation"
          >
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-sm font-medium">{t(s.label)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 group-hover:text-foreground/80 transition">
              {t(s.q)}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
