import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const ChatInput = z.object({
  messages: z.array(MessageSchema).min(1),
  mode: z.string().default("auto"),
  memory: z.array(z.string()).default([]),
});

const MODE_PROMPTS: Record<string, string> = {
  auto: "Detect the user's intent and adapt your tone naturally between modes.",
  study: "STUDY MODE: Be accurate, concise, exam-focused. Use structured explanations, bullet points, and examples. Avoid filler.",
  creative: "CREATIVE MODE: Be imaginative and vivid. Help with storytelling, worldbuilding, brainstorming. Take creative risks.",
  builder: "BUILDER MODE: Engineering partner. Provide working code, clean architecture, debugging steps. Be precise about tradeoffs.",
  critic: "CRITIC MODE: Challenge assumptions, expose weak logic, find flaws. Push back when something is wrong. Improve the user's reasoning.",
  research: "RESEARCH MODE: Be analytical and citation-aware. Acknowledge uncertainty. Prefer evidence over confident-sounding guesses.",
};

const CORE_SYSTEM = `You are Cortex — a private, futuristic personal AI operating system for a single user.

Core personality:
- Calm, premium, intelligent. Like a partner, not a chatbot.
- NEVER be flattering or sycophantic. No "Great question!", no excessive praise.
- NEVER pretend to know things. If you're unsure, say so plainly.
- Truth over confidence. If the user is wrong, tell them. If something is uncertain, mark it as uncertain.
- Challenge weak logic when it matters. Be direct, never rude.
- Be concise by default. Expand only when it adds real value.
- Use markdown freely (headings, lists, code fences with language tags).`;

export const chatCortex = createServerFn({ method: "POST", response: "raw" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return new Response("LOVABLE_API_KEY missing", { status: 500 });
    }

    const modePrompt = MODE_PROMPTS[data.mode] ?? MODE_PROMPTS.auto;
    const memoryBlock =
      data.memory.length > 0
        ? `\n\nLong-term memory about the user (always relevant):\n${data.memory.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
        : "";

    const systemMessage = {
      role: "system" as const,
      content: `${CORE_SYSTEM}\n\n${modePrompt}${memoryBlock}`,
    };

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [systemMessage, ...data.messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return new Response(text || "Gateway error", { status: upstream.status });
    }

    // Pass-through SSE stream
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  });

/** Detect best mode based on user input. Lightweight non-streaming call. */
export const detectMode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ text: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { mode: "auto" };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              'Classify the user message into ONE mode: study, creative, builder, critic, research, or auto. Reply with ONLY the single lowercase word. "auto" means general conversation.',
          },
          { role: "user", content: data.text.slice(0, 800) },
        ],
      }),
    });

    if (!res.ok) return { mode: "auto" };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "auto";
    const allowed = ["study", "creative", "builder", "critic", "research", "auto"];
    return { mode: allowed.includes(raw) ? raw : "auto" };
  });
