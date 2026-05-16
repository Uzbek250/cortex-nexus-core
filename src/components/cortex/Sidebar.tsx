import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Settings, Trash2, Brain, Zap, MessageSquare } from "lucide-react";
import { CortexLogo } from "./CortexLogo";
import type { Conversation } from "@/lib/cortex-types";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: (temporary: boolean) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  temporaryMode: boolean;
  onToggleTemporary: () => void;
}

export function Sidebar({
  conversations, activeId, onSelect, onNew, onDelete,
  onOpenSettings, onOpenMemory, temporaryMode, onToggleTemporary,
}: Props) {
  const [q, setQ] = useState("");
  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <aside className="glass-strong h-full w-72 flex flex-col rounded-r-3xl border-r border-border/40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <CortexLogo size={32} />
        <div>
          <div className="text-base font-medium tracking-[0.2em] text-aurora">CORTEX</div>
          <div className="text-[10px] tracking-widest text-muted-foreground uppercase">v1.0 · Online</div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 space-y-2">
        <button
          onClick={() => onNew(false)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl glass-input hover:bg-primary/10 transition-all group ring-glow"
        >
          <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
          <span className="text-sm font-medium">New chat</span>
        </button>

        <button
          onClick={onToggleTemporary}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all",
            temporaryMode
              ? "bg-accent/15 text-accent border border-accent/30"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Temporary chat {temporaryMode && "· ON"}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 mt-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            className="w-full pl-9 pr-3 py-2 rounded-lg glass-input text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 mt-3 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 text-center mt-6 px-4">
            No conversations yet. Start a new chat.
          </div>
        ) : (
          filtered.map((c) => (
            <motion.div
              key={c.id}
              layout
              className={cn(
                "group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all",
                activeId === c.id
                  ? "bg-primary/12 text-foreground"
                  : "hover:bg-white/5 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="text-sm truncate flex-1">{c.title}</span>
              {c.is_temporary && <Zap className="w-3 h-3 text-accent shrink-0" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border/40 space-y-1">
        <button
          onClick={onOpenMemory}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
        >
          <Brain className="w-4 h-4" />
          Memory
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
