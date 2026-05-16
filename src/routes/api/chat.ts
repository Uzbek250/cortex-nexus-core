import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const ChatBody = z.object({
  messages: z.array(MessageSchema).min(1),
  mode: z.string().default("auto"),
  memory: z.array(z.string()).default([]),
});

const MODE_PROMPTS: Record<string, string> = {
  auto: "Detect the user's intent and adapt your tone naturally between modes.",
  study: "STUDY MODE: Accurate, concise, exam-focused. Structured explanations, bullets, examples.",
  creative: "CREATIVE MODE: Imaginative and vivid. Storytelling, worldbuilding, brainstorming.",
  builder: "BUILDER MODE: Engineering partner. Working code, clean architecture, debugging, tradeoffs.",
  critic: "CRITIC MODE: Challenge assumptions, expose weak logic, find flaws. Push back when wrong.",
  research: "RESEARCH MODE: Analytical, citation-aware. Acknowledge uncertainty. Evidence > confidence.",
};

const CORE_SYSTEM = `You are Cortex — a private, futuristic personal AI operating system for a single user.

Personality:
- Calm, premium, intelligent. A partner, not a chatbot.
- NEVER flattering or sycophantic. No "Great question!", no excessive praise.
- NEVER pretend to know things. If unsure, say "I don't know" plainly.
- Truth over confidence. If the user is wrong, tell them directly.
- Challenge weak logic when it matters. Direct, never rude.
- Concise by default. Expand when it adds real value.
- Use markdown (headings, lists, code fences with language tags).`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let parsed;
        try {
          const raw = await request.json();
          parsed = ChatBody.parse(raw);
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const modePrompt = MODE_PROMPTS[parsed.mode] ?? MODE_PROMPTS.auto;
        const memoryBlock =
          parsed.memory.length > 0
            ? `\n\nLong-term memory about the user:\n${parsed.memory.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
            : "";

        const systemMessage = {
          role: "system",
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
            messages: [systemMessage, ...parsed.messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          if (upstream.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit reached. Please slow down." }), {
              status: 429,
              headers: { "Content-Type": "application/json" },
            });
          }
          if (upstream.status === 402) {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace Settings." }),
              { status: 402, headers: { "Content-Type": "application/json" } },
            );
          }
          const text = await upstream.text().catch(() => "");
          return new Response(JSON.stringify({ error: text || "Gateway error" }), {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
