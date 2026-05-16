import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "./Message";
import { InputBar } from "./InputBar";
import { EmptyState } from "./EmptyState";
import type { ChatMessage } from "@/lib/cortex-types";

interface Props {
  conversationId: string | null;
  isTemporary: boolean;
  memory: string[];
  onCreateConversation: (firstMsg: string) => Promise<string>;
  onModeChange: (mode: string) => void;
  onTitleSet: (id: string, title: string) => void;
}

export function ChatView({
  conversationId, isTemporary, memory, onCreateConversation, onModeChange, onTitleSet,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages on conv change
  useEffect(() => {
    setMessages([]);
    if (!conversationId || isTemporary) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    })();
  }, [conversationId, isTemporary]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    // Create conv if needed
    let convId = conversationId;
    if (!convId && !isTemporary) {
      convId = await onCreateConversation(text);
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();
    const nextMsgs = [...messages, userMsg, { id: assistantId, role: "assistant" as const, content: "" }];
    setMessages(nextMsgs);
    setStreaming(true);

    // Persist user msg
    if (convId && !isTemporary) {
      supabase.from("messages").insert({
        conversation_id: convId, role: "user", content: text,
      }).then(() => {});
      // Title from first message
      if (messages.length === 0) {
        const title = text.slice(0, 48) + (text.length > 48 ? "…" : "");
        supabase.from("conversations").update({ title }).eq("id", convId).then(() => {});
        onTitleSet(convId, title);
      }
    }

    // Detect mode (fire and forget UI hint)
    fetch("/api/detect-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((j: { mode: string }) => onModeChange(j.mode))
      .catch(() => {});

    // Stream chat
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          mode: "auto",
          memory,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => ({ error: "Request failed" }));
        acc = `⚠️ ${errJson.error ?? "Something went wrong."}`;
        setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, content: acc } : x));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              acc += delta;
              setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, content: acc } : x));
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        acc = acc || "⚠️ Connection lost.";
        setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, content: acc } : x));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      if (convId && !isTemporary && acc) {
        supabase.from("messages").insert({
          conversation_id: convId, role: "assistant", content: acc,
        }).then(() => {});
      }
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  streaming={streaming && i === messages.length - 1 && m.role === "assistant" && !m.content}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <div className="px-4 sm:px-8 pb-6 pt-2 max-w-3xl mx-auto w-full">
        <InputBar onSend={send} busy={streaming} onStop={stop} />
      </div>
    </div>
  );
}
