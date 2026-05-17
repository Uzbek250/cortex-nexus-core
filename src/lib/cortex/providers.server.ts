// Cortex provider layer — direct Groq + OpenRouter integration.
// Both use OpenAI-compatible /chat/completions endpoints (same SSE format).

import type { Provider } from "./orchestrator";

const ENDPOINTS: Record<Provider, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

export function getApiKey(provider: Provider): string | undefined {
  return provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
}

export function providerAvailable(provider: Provider): boolean {
  return Boolean(getApiKey(provider));
}

function headers(provider: Provider, apiKey: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider === "openrouter") {
    h["HTTP-Referer"] = "https://cortex.lovable.app";
    h["X-Title"] = "Cortex";
  }
  return h;
}

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatJSON(
  provider: Provider,
  model: string,
  messages: ChatMsg[],
  maxTokens?: number,
): Promise<string> {
  const key = getApiKey(provider);
  if (!key) throw new Error(`missing_${provider}_key`);
  const res = await fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: headers(provider, key),
    body: JSON.stringify({
      model,
      messages,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${provider}_${res.status}:${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

export async function chatStream(
  provider: Provider,
  model: string,
  messages: ChatMsg[],
): Promise<Response> {
  const key = getApiKey(provider);
  if (!key) throw new Error(`missing_${provider}_key`);
  return fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: headers(provider, key),
    body: JSON.stringify({ model, messages, stream: true }),
  });
}

// --- Tavily web search ----------------------------------------------------
export interface SearchHit {
  title: string;
  url: string;
  content: string;
}

export async function tavilySearch(query: string, max = 5): Promise<SearchHit[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: max,
        search_depth: "basic",
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
    return (j.results ?? []).slice(0, max).map((r) => ({
      title: r.title,
      url: r.url,
      content: (r.content ?? "").slice(0, 600),
    }));
  } catch {
    return [];
  }
}

export function tavilyAvailable(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export function formatSearchContext(hits: SearchHit[]): string {
  if (hits.length === 0) return "";
  const lines = hits.map(
    (h, i) => `[${i + 1}] ${h.title}\nURL: ${h.url}\n${h.content}`,
  );
  return `\n\nLive web search results (cite as [1], [2], ...):\n${lines.join("\n\n")}`;
}