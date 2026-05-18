import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BootScreen } from "@/components/cortex/BootScreen";
import { Sidebar } from "@/components/cortex/Sidebar";
import { TopBar } from "@/components/cortex/TopBar";
import { ChatView } from "@/components/cortex/ChatView";
import { SettingsDialog } from "@/components/cortex/SettingsDialog";
import { MemoryDialog } from "@/components/cortex/MemoryDialog";
import type { Conversation } from "@/lib/cortex-types";
import type { CortexPhase } from "@/components/cortex/BrainViz";
import { LanguageProvider, useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/")({
  component: CortexApp,
  head: () => ({
    meta: [
      { title: "Cortex · Personal AI OS" },
      { name: "description", content: "Cortex — a private, futuristic personal AI operating system." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
    ],
  }),
});

function CortexApp() {
  return (
    <LanguageProvider>
      <CortexAppInner />
    </LanguageProvider>
  );
}

function CortexAppInner() {
  const [booted, setBooted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [temporary, setTemporary] = useState(false);
  const [mode, setMode] = useState("auto");
  const [phase, setPhase] = useState<CortexPhase>("idle");
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [memoryItems, setMemoryItems] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const isMobile = useIsMobile();
  const { t } = useI18n();
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

  // Lock background scroll while mobile drawer is open
  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpen ? "hidden" : prev || "";
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen, isMobile]);

  // Close drawer when crossing breakpoint
  useEffect(() => { if (!isMobile) setSidebarOpen(false); }, [isMobile]);

  const startNewChat = (isTemp: boolean) => {
    setTemporary(isTemp);
    setActiveId(null);
    setMode("auto");
    setActiveModel(null);
    setPhase("idle");
    setChatKey((k) => k + 1); // remount ChatView -> clears messages + refocuses input
    setSidebarOpen(false);
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
    if (!confirm(t("settings.clearConfirm"))) return;
    await supabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setConversations([]);
    setActiveId(null);
    setSettingsOpen(false);
  };

  return (
    <>
      <AnimatePresence>{!booted && <BootScreen onDone={() => setBooted(true)} />}</AnimatePresence>

      <div className="flex h-[100dvh] w-full overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && (
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={(id) => { setActiveId(id); setTemporary(false); }}
            onNew={startNewChat}
            onDelete={deleteConv}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenMemory={() => setMemoryOpen(true)}
            temporaryMode={temporary}
            onToggleTemporary={() => { setTemporary((x) => !x); setActiveId(null); setChatKey((k) => k + 1); }}
          />
        )}

        {/* Mobile drawer */}
        {isMobile && (
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                key="drawer"
                className="fixed inset-0 z-40 flex"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-background/70 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSidebarOpen(false)}
                />
                <motion.div
                  className="relative h-full will-change-transform"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Sidebar
                    isMobile
                    onClose={() => setSidebarOpen(false)}
                    conversations={conversations}
                    activeId={activeId}
                    onSelect={(id) => { setActiveId(id); setTemporary(false); setSidebarOpen(false); }}
                    onNew={startNewChat}
                    onDelete={deleteConv}
                    onOpenSettings={() => { setSettingsOpen(true); setSidebarOpen(false); }}
                    onOpenMemory={() => { setMemoryOpen(true); setSidebarOpen(false); }}
                    temporaryMode={temporary}
                    onToggleTemporary={() => { setTemporary((x) => !x); setActiveId(null); setChatKey((k) => k + 1); }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <main className="flex-1 flex flex-col min-w-0">
          <TopBar
            mode={mode}
            internet={settings.internet_enabled}
            memory={settings.memory_enabled && memoryItems.length > 0}
            voice={settings.voice_enabled}
            phase={phase}
            activeModel={activeModel}
            onMenu={isMobile ? () => setSidebarOpen(true) : undefined}
          />
          <ChatView
            key={chatKey}
            conversationId={activeId}
            isTemporary={temporary}
            memory={settings.memory_enabled ? memoryItems : []}
            internetEnabled={settings.internet_enabled}
            voiceEnabled={settings.voice_enabled}
            onCreateConversation={createConv}
            onModeChange={setMode}
            onPhaseChange={setPhase}
            onModelChange={setActiveModel}
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
