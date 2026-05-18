import { Globe, Brain, Mic, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrainViz, type CortexPhase } from "./BrainViz";
import { useI18n } from "@/lib/i18n";

const MODE_META: Record<string, { en: string; uz: string; color: string }> = {
  auto: { en: "Adaptive", uz: "Moslashuvchan", color: "from-primary to-accent" },
  study: { en: "Study", uz: "O'qish", color: "from-emerald-400 to-cyan-400" },
  creative: { en: "Creative", uz: "Ijodiy", color: "from-fuchsia-400 to-purple-400" },
  builder: { en: "Builder", uz: "Quruvchi", color: "from-cyan-400 to-blue-400" },
  critic: { en: "Critic", uz: "Tanqidchi", color: "from-amber-400 to-rose-400" },
  research: { en: "Research", uz: "Tadqiqot", color: "from-violet-400 to-indigo-400" },
};

interface Props {
  mode: string;
  internet: boolean;
  memory: boolean;
  voice: boolean;
  phase: CortexPhase;
  activeModel: string | null;
  onMenu?: () => void;
}

export function TopBar({ mode, internet, memory, voice, phase, activeModel, onMenu }: Props) {
  const { t, lang } = useI18n();
  const m = MODE_META[mode] ?? MODE_META.auto;
  const modeLabel = lang === "uz" ? m.uz : m.en;
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 glass-strong rounded-2xl mx-2 sm:mx-4 mt-3 sm:mt-4">
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        {onMenu && (
          <button
            onClick={onMenu}
            aria-label="Open menu"
            className="md:hidden h-9 w-9 -ml-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <BrainViz phase={phase} model={activeModel} />
        <div className="hidden sm:flex items-center gap-2 pl-5 border-l border-border/40">
          <div className="relative">
            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-br", m.color)} />
            <div className={cn("absolute inset-0 w-2 h-2 rounded-full bg-gradient-to-br animate-ping opacity-60", m.color)} />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("topbar.mode")}</span>
          <span className={cn("text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent", m.color)}>
            {modeLabel}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground">
        <Indicator icon={<Globe className="w-3.5 h-3.5" />} label={t("topbar.internet")} on={internet} />
        <Indicator icon={<Brain className="w-3.5 h-3.5" />} label={t("topbar.memory")} on={memory} />
        <Indicator icon={<Mic className="w-3.5 h-3.5" />} label={t("topbar.voice")} on={voice} />
      </div>
    </div>
  );
}

function Indicator({ icon, label, on }: { icon: React.ReactNode; label: string; on: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 transition", on ? "text-primary" : "text-muted-foreground/50")}>
      {icon}
      <span className="tracking-wide">{label}</span>
      <span className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-primary shadow-[0_0_8px_currentColor]" : "bg-muted-foreground/30")} />
    </div>
  );
}
