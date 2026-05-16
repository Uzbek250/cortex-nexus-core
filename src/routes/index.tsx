import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BootScreen } from "@/components/cortex/BootScreen";
import { Sidebar } from "@/components/cortex/Sidebar";
import { TopBar } from "@/components/cortex/TopBar";
import { ChatView } from "@/components/cortex/ChatView";
import { SettingsDialog } from "@/components/cortex/SettingsDialog";
import { MemoryDialog } from "@/components/cortex/MemoryDialog";
import type { Conversation } from "@/lib/cortex-types";

export const Route = createFileRoute("/")({
  component: CortexApp,
  head: () => ({
    meta: [
      { title: "Cortex · Personal AI OS" },
      { name: "description", content: "Cortex — a private, futuristic personal AI operating system." },
    ],
  }),
});

function CortexApp() {
  const [booted, setBooted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [temporary, setTemporary] = useState(false);
  const [mode, setMode] = useState("auto");
  const [memoryItems, setMemoryItems] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [settings, setSettings] = useState({
    memory_enabled: true,
    internet_enabled: false,
    voice_enabled: false,
    preferred_model: "google/gemini-2.5-flash",
  });

  const loadConvs = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id,title,is_temporary,mode,updated_at")
      .eq("is_temporary", false)
      .order("updated_at", { ascending: false });
    setConversations((data ?? []) as Conversation[]);
  };

  const loadMemory = async () => {
    const { data } = await supabase.from("memory").select("content").order("created_at");
    setMemoryItems((data ?? []).map((r: { content: string }) => r.content));
  };

  const loadSettings = async () => {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (data) setSettings({
      memory_enabled: data.memory_enabled,
      internet_enabled: data.internet_enabled,
      voice_enabled: data.voice_enabled,
      preferred_model: data.preferred_model,
    });
  };

  useEffect(() => {
    loadConvs(); loadMemory(); loadSettings();
  }, []);

  const newChat = async (isTemp: boolean) => {
    setTemporary(isTemp);
    setActiveId(null);
    if (isTemp) return;
  };

  const createConv = async (firstMsg: string): Promise<string> => {
    const title = firstMsg.slice(0, 48) + (firstMsg.length > 48 ? "…" : "");
    const { data } = await supabase
      .from("conversations")
      .insert({ title, is_temporary: false, mode: "auto" })
      .select("id,title,is_temporary,mode,updated_at")
      .single();
    if (data) {
      setConversations((c) => [data as Conversation, ...c]);
      setActiveId(data.id);
      return data.id;
    }
    return "";
  };

  const deleteConv = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const clearAll = async () => {
    if (!confirm("Delete all conversations? This cannot be undone.")) return;
    await supabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setConversations([]);
    setActiveId(null);
    setSettingsOpen(false);
  };

  return (
    <>
      <AnimatePresence>{!booted && <BootScreen onDone={() => setBooted(true)} />}</AnimatePresence>

      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setTemporary(false); }}
          onNew={newChat}
          onDelete={deleteConv}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMemory={() => setMemoryOpen(true)}
          temporaryMode={temporary}
          onToggleTemporary={() => { setTemporary((t) => !t); setActiveId(null); }}
        />

        <main className="flex-1 flex flex-col min-w-0">
          <TopBar
            mode={mode}
            internet={settings.internet_enabled}
            memory={settings.memory_enabled && memoryItems.length > 0}
            voice={settings.voice_enabled}
          />
          <ChatView
            conversationId={activeId}
            isTemporary={temporary}
            memory={settings.memory_enabled ? memoryItems : []}
            onCreateConversation={createConv}
            onModeChange={setMode}
            onTitleSet={(id, title) =>
              setConversations((c) => c.map((x) => (x.id === id ? { ...x, title } : x)))
            }
          />
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        onClearHistory={clearAll}
      />
      <MemoryDialog open={memoryOpen} onClose={() => { setMemoryOpen(false); loadMemory(); }} />
    </>
  );
}
