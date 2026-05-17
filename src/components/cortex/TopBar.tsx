import { Globe, Brain, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrainViz, type CortexPhase } from "./BrainViz";

const MODE_META: Record<string, { label: string; color: string }> = {
  auto: { label: "Adaptive", color: "from-primary to-accent" },
  study: { label: "Study", color: "from-emerald-400 to-cyan-400" },
  creative: { label: "Creative", color: "from-fuchsia-400 to-purple-400" },
  builder: { label: "Builder", color: "from-cyan-400 to-blue-400" },
  critic: { label: "Critic", color: "from-amber-400 to-rose-400" },
  research: { label: "Research", color: "from-violet-400 to-indigo-400" },
};

interface Props {
  mode: string;
  internet: boolean;
  memory: boolean;
  voice: boolean;
  phase: CortexPhase;
  activeModel: string | null;
}

export function TopBar({ mode, internet, memory, voice, phase, activeModel }: Props) {
  const m = MODE_META[mode] ?? MODE_META.auto;
  return (
    <div className="flex items-center justify-between px-6 py-3 glass-strong rounded-2xl mx-4 mt-4">
      <div className="flex items-center gap-5 min-w-0">
        <BrainViz phase={phase} model={activeModel} />
        <div className="hidden sm:flex items-center gap-2 pl-5 border-l border-border/40">
          <div className="relative">
            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-br", m.color)} />
            <div className={cn("absolute inset-0 w-2 h-2 rounded-full bg-gradient-to-br animate-ping opacity-60", m.color)} />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Mode</span>
          <span className={cn("text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent", m.color)}>
            {m.label}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground">
        <Indicator icon={<Globe className="w-3.5 h-3.5" />} label="Internet" on={internet} />
        <Indicator icon={<Brain className="w-3.5 h-3.5" />} label="Memory" on={memory} />
        <Indicator icon={<Mic className="w-3.5 h-3.5" />} label="Voice" on={voice} />
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
