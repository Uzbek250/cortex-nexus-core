import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "uz";

const DICT = {
  en: {
    "brand.tagline": "Personal AI OS",
    "brand.online": "Online",
    "sidebar.newChat": "New chat",
    "sidebar.temporary": "Temporary chat",
    "sidebar.tempOn": "ON",
    "sidebar.search": "Search chats",
    "sidebar.empty": "No conversations yet. Start a new chat.",
    "sidebar.memory": "Memory",
    "sidebar.settings": "Settings",
    "sidebar.close": "Close",
    "sidebar.open": "Open menu",
    "topbar.mode": "Mode",
    "topbar.internet": "Internet",
    "topbar.memory": "Memory",
    "topbar.voice": "Voice",
    "input.placeholder": "Ask Cortex anything…",
    "input.listening": "Listening…",
    "input.transcribing": "Transcribing…",
    "input.hint.enter": "Enter",
    "input.hint.shiftEnter": "Shift+Enter",
    "input.hint.text": "Cortex thinks carefully. Press {a} to send, {b} for a new line.",
    "empty.title": "How can I help,",
    "empty.titleAccent": "today",
    "empty.subtitle": "I'll adapt my mode automatically. Truthful, direct, never flattering.",
    "empty.s1": "Explain a concept",
    "empty.s1q": "Explain quantum entanglement like I have a physics background.",
    "empty.s2": "Build something",
    "empty.s2q": "Help me design a real-time chat app architecture.",
    "empty.s3": "Brainstorm",
    "empty.s3q": "Give me 5 unconventional startup ideas in AI tooling.",
    "empty.s4": "Pressure-test an idea",
    "empty.s4q": "I want to drop out of college to start a company. Challenge my thinking.",
    "settings.title": "Settings",
    "settings.providers": "AI Providers",
    "settings.providers.note": "Keys are stored server-side and never exposed to the browser.",
    "settings.connected": "Connected",
    "settings.notConfigured": "Not configured",
    "settings.memory.title": "Long-term memory",
    "settings.memory.desc": "Cortex uses saved facts to personalize answers.",
    "settings.internet.title": "Internet access",
    "settings.internet.on": "Tavily web search for fresh facts when needed.",
    "settings.internet.off": "Add TAVILY_API_KEY to enable web search.",
    "settings.voice.title": "Voice",
    "settings.voice.on": "Groq Whisper speech-to-text in the input bar.",
    "settings.voice.off": "Add GROQ_API_KEY to enable voice.",
    "settings.model.title": "Preferred model",
    "settings.model.desc": "Cortex always picks the right tool for the job. This is the default.",
    "settings.language.title": "Language",
    "settings.language.desc": "Interface language.",
    "settings.clear": "Clear all conversations",
    "settings.clearConfirm": "Delete all conversations? This cannot be undone.",
    "memory.title": "Long-term memory",
    "memory.subtitle": "Facts Cortex remembers across every conversation.",
    "memory.placeholder": "I prefer concise answers. My name is…",
    "memory.empty": "No memories yet. Anything you add here is sent with every chat.",
    "boot.l1": "Initializing neural core…",
    "boot.l2": "Calibrating reasoning lattice…",
    "boot.l3": "Loading long-term memory…",
    "boot.l4": "Cortex is online.",
    "boot.tagline": "Personal AI Operating System",
  },
  uz: {
    "brand.tagline": "Shaxsiy AI tizimi",
    "brand.online": "Onlayn",
    "sidebar.newChat": "Yangi chat",
    "sidebar.temporary": "Vaqtinchalik chat",
    "sidebar.tempOn": "YONIQ",
    "sidebar.search": "Chatlarni qidirish",
    "sidebar.empty": "Hali chatlar yo'q. Yangi chat boshlang.",
    "sidebar.memory": "Xotira",
    "sidebar.settings": "Sozlamalar",
    "sidebar.close": "Yopish",
    "sidebar.open": "Menyuni ochish",
    "topbar.mode": "Rejim",
    "topbar.internet": "Internet",
    "topbar.memory": "Xotira",
    "topbar.voice": "Ovoz",
    "input.placeholder": "Cortex'dan nimani so'rasangiz bo'ladi…",
    "input.listening": "Tinglanyapti…",
    "input.transcribing": "Matnga o'girilmoqda…",
    "input.hint.enter": "Enter",
    "input.hint.shiftEnter": "Shift+Enter",
    "input.hint.text": "Cortex sinchkovlik bilan o'ylaydi. Yuborish — {a}, yangi qator — {b}.",
    "empty.title": "Bugun sizga qanday yordam beray,",
    "empty.titleAccent": "do'stim",
    "empty.subtitle": "Rejimni o'zim sozlayman. Halol, to'g'ridan-to'g'ri, ortiqcha maqtovsiz.",
    "empty.s1": "Tushuncha bering",
    "empty.s1q": "Kvant chigallashuvini fizikadan xabarim bordek tushuntiring.",
    "empty.s2": "Birgalikda quraylik",
    "empty.s2q": "Realtime chat ilovasi arxitekturasini loyihalashga yordam bering.",
    "empty.s3": "Fikr almashish",
    "empty.s3q": "AI vositalari bo'yicha 5 ta noodatiy startap g'oyasini taklif eting.",
    "empty.s4": "G'oyani sinab ko'ring",
    "empty.s4q": "Universitetni tashlab kompaniya ochmoqchiman. Fikrimni tanqid qiling.",
    "settings.title": "Sozlamalar",
    "settings.providers": "AI provayderlari",
    "settings.providers.note": "Kalitlar server tomonida saqlanadi va brauzerga ko'rsatilmaydi.",
    "settings.connected": "Ulangan",
    "settings.notConfigured": "Sozlanmagan",
    "settings.memory.title": "Uzoq muddatli xotira",
    "settings.memory.desc": "Cortex saqlangan ma'lumotlardan javoblarni shaxsiylashtirish uchun foydalanadi.",
    "settings.internet.title": "Internetga ulanish",
    "settings.internet.on": "Yangi faktlar uchun Tavily orqali veb qidiruv.",
    "settings.internet.off": "Veb qidiruvni yoqish uchun TAVILY_API_KEY qo'shing.",
    "settings.voice.title": "Ovoz",
    "settings.voice.on": "Kiritish maydonida Groq Whisper orqali nutqni matnga aylantirish.",
    "settings.voice.off": "Ovozni yoqish uchun GROQ_API_KEY qo'shing.",
    "settings.model.title": "Tanlangan model",
    "settings.model.desc": "Cortex har bir vazifaga to'g'ri modelni o'zi tanlaydi. Bu — standart variant.",
    "settings.language.title": "Til",
    "settings.language.desc": "Interfeys tili.",
    "settings.clear": "Barcha suhbatlarni o'chirish",
    "settings.clearConfirm": "Barcha suhbatlar o'chirilsinmi? Buni qaytarib bo'lmaydi.",
    "memory.title": "Uzoq muddatli xotira",
    "memory.subtitle": "Cortex har bir suhbatda eslab qoladigan faktlar.",
    "memory.placeholder": "Qisqa javoblarni afzal ko'raman. Ismim — …",
    "memory.empty": "Hozircha xotira bo'sh. Bu yerga qo'shilganlar har bir suhbatda yuboriladi.",
    "boot.l1": "Neyron yadro ishga tushirilmoqda…",
    "boot.l2": "Fikrlash to'ri sozlanmoqda…",
    "boot.l3": "Uzoq muddatli xotira yuklanmoqda…",
    "boot.l4": "Cortex tayyor.",
    "boot.tagline": "Shaxsiy AI operatsion tizimi",
  },
} as const;

export type TKey = keyof typeof DICT["en"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey, vars?: Record<string, string>) => string;
}

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("cortex.lang")) as Lang | null;
    if (saved === "en" || saved === "uz") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("cortex.lang", l); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  const t = (k: TKey, vars?: Record<string, string>) => {
    let s: string = (DICT[lang] as Record<string, string>)[k] ?? (DICT.en as Record<string, string>)[k] ?? k;
    if (vars) for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, val);
    return s;
  };

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}