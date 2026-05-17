// Cortex Orchestration Layer
// Pure helpers for intent detection, model routing, memory selection, and critic prompts.
// Server-only consumers: src/routes/api/orchestrate.ts

export type Provider = "groq" | "openrouter";

export type Intent =
  | "coding"
  | "research"
  | "creative"
  | "study"
  | "critique"
  | "productivity"
  | "casual";

export type CortexMode =
  | "builder"
  | "research"
  | "creative"
  | "study"
  | "critic"
  | "auto";

export interface RoutingDecision {
  intent: Intent;
  mode: CortexMode;
  model: string;
  provider: Provider;
  criticModel: string;
  criticProvider: Provider;
  needsSearch: boolean;
  reasoning: string;
}

// Real production routing across Groq + OpenRouter.
//
//  coding      → OpenRouter deepseek-chat       (strongest code reasoning, cheap)
//  research    → OpenRouter qwen-2.5-72b        (long-context analysis)
//  creative    → Groq gemma2-9b-it              (vivid, fast generation)
//  casual      → Groq llama-3.3-70b-versatile   (fast general chat)
//  study       → Groq llama-3.3-70b-versatile
//  productivity→ Groq llama-3.3-70b-versatile
//  critique    → Groq llama-3.1-8b-instant      (lightweight critic pass)
export const MODEL_MAP: Record<Intent, { model: string; provider: Provider }> = {
  coding:       { model: "deepseek/deepseek-chat",           provider: "openrouter" },
  research:     { model: "qwen/qwen-2.5-72b-instruct",       provider: "openrouter" },
  creative:     { model: "gemma2-9b-it",                     provider: "groq" },
  study:        { model: "llama-3.3-70b-versatile",          provider: "groq" },
  productivity: { model: "llama-3.3-70b-versatile",          provider: "groq" },
  critique:     { model: "llama-3.1-8b-instant",             provider: "groq" },
  casual:       { model: "llama-3.3-70b-versatile",          provider: "groq" },
};

// Fallback chain when primary provider fails.
export const FALLBACK: { model: string; provider: Provider } = {
  model: "llama-3.3-70b-versatile",
  provider: "groq",
};

export const INTENT_TO_MODE: Record<Intent, CortexMode> = {
  coding: "builder",
  research: "research",
  creative: "creative",
  study: "study",
  critique: "critic",
  productivity: "auto",
  casual: "auto",
};

export const CRITIC_MODEL = "llama-3.1-8b-instant";
export const CRITIC_PROVIDER: Provider = "groq";
export const CLASSIFIER_MODEL = "llama-3.1-8b-instant";
export const CLASSIFIER_PROVIDER: Provider = "groq";

// --- Core personality (shared system prompt) ----------------------------
export const CORTEX_CORE_PROMPT = `You are Cortex — a private, futuristic personal AI operating system for a single user.

Operating principles (non-negotiable):
- Truth over confidence. If you don't know, say "I don't know" plainly.
- Concise by default. Expand only when depth adds real value.
- Never flattering or sycophantic. No "Great question!", no excessive praise.
- Never fake motivation or hype. Match the user's register.
- Willing to challenge the user's assumptions when the logic is weak.
- Transparent uncertainty: mark guesses, distinguish fact from inference.
- Intellectually honest. If the user is wrong, say so directly and briefly.
- Use markdown (headings, lists, code fences with language tags).`;

const MODE_PROMPTS: Record<CortexMode, string> = {
  builder:
    "BUILDER MODE: engineering partner. Working code, clear architecture, real tradeoffs, debugging. Prefer minimal viable examples over walls of text.",
  research:
    "RESEARCH MODE: analytical and citation-aware. Distinguish established fact from inference. Acknowledge uncertainty. Evidence beats confidence.",
  creative:
    "CREATIVE MODE: imaginative and vivid. Storytelling, worldbuilding, brainstorming with concrete sensory detail and unexpected angles.",
  study:
    "STUDY MODE: accurate, structured explanations. Definitions first, then mechanism, then a concrete example, then common pitfalls.",
  critic:
    "CRITIC MODE: challenge assumptions, expose weak logic, find flaws. Push back when the user is wrong. Direct, never rude.",
  auto: "ADAPTIVE MODE: read the user's intent and adapt naturally.",
};

export function buildSystemPrompt(mode: CortexMode, memories: string[]): string {
  const memBlock =
    memories.length === 0
      ? ""
      : `\n\nRelevant long-term memory about the user (use only if pertinent):\n${memories
          .map((m, i) => `${i + 1}. ${m}`)
          .join("\n")}`;
  return `${CORTEX_CORE_PROMPT}\n\n${MODE_PROMPTS[mode]}${memBlock}`;
}

// --- Intent classifier prompt -----------------------------------------------
export const CLASSIFIER_SYSTEM = `You are Cortex's intent router.
Given the latest user message and brief recent context, output ONE JSON object and nothing else:

{"intent":"coding|research|creative|study|critique|productivity|casual","needsSearch":true|false,"reasoning":"<one short sentence>"}

Rules for needsSearch:
- true ONLY when the answer depends on current events, live data, specific factual lookups, citations, or verification the model cannot reliably know from training.
- false for explanations, opinions, code, brainstorming, math, general knowledge, or anything timeless.

Examples:
"refactor this react hook" → {"intent":"coding","needsSearch":false,"reasoning":"code task"}
"what happened in the markets today" → {"intent":"research","needsSearch":true,"reasoning":"current events"}
"explain entropy" → {"intent":"study","needsSearch":false,"reasoning":"timeless concept"}
"poke holes in this plan" → {"intent":"critique","needsSearch":false,"reasoning":"reasoning critique"}
"give me five startup ideas" → {"intent":"creative","needsSearch":false,"reasoning":"brainstorm"}
"hey" → {"intent":"casual","needsSearch":false,"reasoning":"chitchat"}`;

export function parseClassifierOutput(raw: string): {
  intent: Intent;
  needsSearch: boolean;
  reasoning: string;
} {
  const fallback = { intent: "casual" as Intent, needsSearch: false, reasoning: "fallback" };
  if (!raw) return fallback;
  // strip code fences if any
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    const j = JSON.parse(match[0]);
    const intent = (
      ["coding", "research", "creative", "study", "critique", "productivity", "casual"].includes(j.intent)
        ? j.intent
        : "casual"
    ) as Intent;
    return {
      intent,
      needsSearch: Boolean(j.needsSearch),
      reasoning: String(j.reasoning ?? ""),
    };
  } catch {
    return fallback;
  }
}

export function routeFromIntent(intent: Intent, needsSearch: boolean, reasoning: string): RoutingDecision {
  const m = MODEL_MAP[intent];
  return {
    intent,
    mode: INTENT_TO_MODE[intent],
    model: m.model,
    provider: m.provider,
    criticModel: CRITIC_MODEL,
    criticProvider: CRITIC_PROVIDER,
    needsSearch,
    reasoning,
  };
}

// --- Memory selection -------------------------------------------------------
// Lightweight relevance scoring: token overlap with the user message.
// Avoids dumping all memories into every prompt.
const STOPWORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","be","been","being",
  "of","to","in","on","at","for","with","by","from","as","that","this","it",
  "i","you","my","your","me","we","our","us","do","does","did","have","has",
  "had","not","no","so","if","then","than","what","how","why","when","where",
  "can","could","should","would","will","just","about","into","over","there",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function selectRelevantMemories(
  memories: string[],
  userText: string,
  maxItems = 5,
): string[] {
  if (memories.length === 0) return [];
  const qTokens = new Set(tokenize(userText));
  if (qTokens.size === 0) return memories.slice(-maxItems);
  const scored = memories.map((m, idx) => {
    const mTokens = tokenize(m);
    let overlap = 0;
    for (const t of mTokens) if (qTokens.has(t)) overlap++;
    // recency tiebreaker: later items get a tiny boost
    return { m, score: overlap + idx * 0.001 };
  });
  const hits = scored.filter((s) => s.score >= 1);
  // if nothing matched, fall back to most recent 2 (don't flood)
  const pool = hits.length > 0 ? hits : scored.slice(-2);
  return pool.sort((a, b) => b.score - a.score).slice(0, maxItems).map((s) => s.m);
}

// --- Critic prompt ----------------------------------------------------------
export const CRITIC_SYSTEM = `You are Cortex's internal critic. Review a draft assistant reply for:
1. Hallucination risk (claims the model cannot reasonably know).
2. Fake certainty (assertive tone on uncertain facts).
3. Weak reasoning, logical gaps, or contradictions.
4. Sycophancy, filler, or unnecessary padding.
5. Wrong direct answer to the user's actual question.

If the draft is solid, reply with EXACTLY the single token: OK

Otherwise, output a fully rewritten improved reply. No preamble, no explanation
of changes, no "Here's the improved version" — just the new reply, ready to
show the user. Preserve markdown formatting. Keep the same language. Stay
concise — do not add length for its own sake.`;

export function buildCriticUserMessage(userMessage: string, draft: string): string {
  return `USER ASKED:\n${userMessage}\n\nDRAFT REPLY:\n${draft}`;
}

// --- Future-ready hooks -----------------------------------------------------
// Reserved namespaces for upcoming modules. Keep imports stable.
export const FUTURE_MODULES = {
  voice: "src/lib/cortex/voice.ts",
  pdf: "src/lib/cortex/pdf.ts",
  tools: "src/lib/cortex/tools.ts",
  agents: "src/lib/cortex/agents.ts",
  search: "src/lib/cortex/search.ts",
} as const;