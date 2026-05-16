import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Trash2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Overlay, Panel } from "./SettingsDialog";

interface Item { id: string; content: string }

export function MemoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("memory")
      .select("id,content")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const add = async () => {
    const t = text.trim();
    if (!t) return;
    await supabase.from("memory").insert({ content: t });
    setText("");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("memory").delete().eq("id", id);
    load();
  };

  return (
    <AnimatePresence>
      {open && (
        <Overlay onClose={onClose}>
          <Panel title="Long-term memory" onClose={onClose}>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Facts Cortex remembers across every conversation.
            </p>

            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="I prefer concise answers. My name is…"
                className="flex-1 glass-input rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={add}
                disabled={!text.trim()}
                className="px-3 py-2 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-1.5 max-h-72 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground/70 text-center py-6">
                  No memories yet. Anything you add here is sent with every chat.
                </p>
              )}
              {items.map((m) => (
                <div key={m.id} className="group flex items-start gap-2 glass-input rounded-lg p-2.5">
                  <span className="text-sm flex-1">{m.content}</span>
                  <button
                    onClick={() => remove(m.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
