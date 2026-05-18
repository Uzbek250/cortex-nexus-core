import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Loader2, Mic, MicOff, Paperclip, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Props {
  onSend: (text: string) => void;
  busy: boolean;
  onStop: () => void;
  voiceEnabled?: boolean;
  focusKey?: string | number | null;
}

export function InputBar({ onSend, busy, onStop, voiceEnabled = false, focusKey }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { t } = useI18n();

  // Auto-focus on mount and whenever focusKey changes (e.g. New chat pressed)
  useEffect(() => {
    // small delay so drawer-close transitions don't steal focus on mobile
    const id = window.setTimeout(() => ref.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [focusKey]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "voice.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const j = await res.json();
          if (res.ok && j.text) {
            setText((prev) => (prev ? prev + " " + j.text : j.text).trim());
          } else if (j.error) {
            alert("Transcription failed: " + j.error);
          }
        } catch (e) {
          alert("Transcription failed.");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  };

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
          placeholder={recording ? t("input.listening") : transcribing ? t("input.transcribing") : t("input.placeholder")}
          className="flex-1 bg-transparent outline-none resize-none text-base sm:text-sm placeholder:text-muted-foreground/70 py-2 px-1 max-h-[220px]"
          enterKeyHint="send"
        />

        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={!voiceEnabled || transcribing || busy}
          className={cn(
            "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition",
            recording
              ? "bg-destructive/80 text-destructive-foreground animate-pulse"
              : "hover:bg-white/5 text-muted-foreground hover:text-foreground",
            (!voiceEnabled || transcribing || busy) && "opacity-50 cursor-not-allowed",
          )}
          title={voiceEnabled ? (recording ? "Stop recording" : "Voice input") : "Enable voice in Settings"}
        >
          {transcribing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : recording ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
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
      <p className="hidden sm:block text-[10px] text-muted-foreground/60 text-center mt-2 tracking-wide">
        {t("input.hint.text", { a: t("input.hint.enter"), b: t("input.hint.shiftEnter") })
          .split(/(\{[^}]+\})/)
          .map((part, i) =>
            part === t("input.hint.enter") || part === t("input.hint.shiftEnter") ? (
              <kbd key={i} className="px-1 py-0.5 rounded bg-white/5">{part}</kbd>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
      </p>
    </motion.div>
  );
}
