import { useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  busy: boolean;
  onStop: () => void;
}

export function InputBar({ onSend, busy, onStop }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative ring-glow"
    >
      <div className="glass-strong rounded-3xl p-2.5 flex items-end gap-2 shadow-[0_0_60px_oklch(0.78_0.18_215/0.08)]">
        <button
          className="shrink-0 h-9 w-9 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground flex items-center justify-center transition"
          title="Attach file (coming soon)"
          disabled
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 220) + "px";
          }}
          onKeyDown={onKey}
          placeholder="Ask Cortex anything…"
          className="flex-1 bg-transparent outline-none resize-none text-sm placeholder:text-muted-foreground/70 py-2 px-1 max-h-[220px]"
        />

        <button
          className="shrink-0 h-9 w-9 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground flex items-center justify-center transition"
          title="Voice (coming soon)"
          disabled
        >
          <Mic className="w-4 h-4" />
        </button>

        {busy ? (
          <button
            onClick={onStop}
            className="shrink-0 h-9 w-9 rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground flex items-center justify-center transition"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!text.trim()}
            className={cn(
              "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition",
              text.trim()
                ? "bg-gradient-to-br from-primary to-accent text-primary-foreground glow-cyan"
                : "bg-white/5 text-muted-foreground",
            )}
            title="Send"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 text-center mt-2 tracking-wide">
        Cortex thinks carefully. Press <kbd className="px-1 py-0.5 rounded bg-white/5">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-white/5">Shift+Enter</kbd> for a new line.
      </p>
    </motion.div>
  );
}
