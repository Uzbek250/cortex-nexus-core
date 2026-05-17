import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  CLASSIFIER_MODEL,
  CLASSIFIER_SYSTEM,
  CRITIC_SYSTEM,
  buildCriticUserMessage,
  buildSystemPrompt,
  parseClassifierOutput,
  routeFromIntent,
  selectRelevantMemories,
} from "@/lib/cortex/orchestrator";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const Body = z.object({
  messages: z.array(MessageSchema).min(1),
  memory: z.array(z.string()).default([]),
  internetEnabled: z.boolean().default(false),
});

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function gatewayJSON(apiKey: string, model: string, messages: unknown, max?: number) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...(max ? { max_tokens: max } : {}) }),
  });
  if (!res.ok) throw new Error(`gateway_${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

export const Route = createFileRoute("/api/orchestrate")({
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

        let body;
        try {
          body = Body.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const lastUser = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const recentContext = body.messages.slice(-4).map((m) => `${m.role}: ${m.content.slice(0, 240)}`).join("\n");

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const emit = (obj: unknown) => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
              } catch {}
            };

            try {
              // ── PHASE 1: ANALYZE / CLASSIFY ───────────────────────────────
              emit({ type: "phase", phase: "analyzing" });
              let routing;
              try {
                const raw = await gatewayJSON(
                  apiKey,
                  CLASSIFIER_MODEL,
                  [
                    { role: "system", content: CLASSIFIER_SYSTEM },
                    { role: "user", content: `Recent context:\n${recentContext}\n\nLatest user message:\n${lastUser}` },
                  ],
                  200,
                );
                const parsed = parseClassifierOutput(raw);
                routing = routeFromIntent(parsed.intent, parsed.needsSearch, parsed.reasoning);
              } catch {
                routing = routeFromIntent("casual", false, "classifier_failed");
              }

              // ── PHASE 2: ROUTE + MEMORY SELECTION ─────────────────────────
              emit({ type: "phase", phase: "routing", model: routing.model });
              const relevantMemories = selectRelevantMemories(body.memory, lastUser, 5);

              emit({
                type: "meta",
                intent: routing.intent,
                mode: routing.mode,
                model: routing.model,
                needsSearch: routing.needsSearch,
                memoriesUsed: relevantMemories.length,
                reasoning: routing.reasoning,
              });

              // ── PHASE 3: SEARCH (decision only; provider not yet wired) ──
              if (routing.needsSearch && body.internetEnabled) {
                emit({ type: "phase", phase: "searching" });
                // Future: plug Tavily/Exa here and prepend results to system prompt.
                // For now, surface a transparent note so the model doesn't fabricate.
                relevantMemories.push(
                  "[system] Web search would activate here; not yet wired. State uncertainty for time-sensitive facts.",
                );
              }

              // ── PHASE 4: GENERATE (streamed) ──────────────────────────────
              emit({ type: "phase", phase: "generating", model: routing.model });

              const systemPrompt = buildSystemPrompt(routing.mode, relevantMemories);
              const upstream = await fetch(GATEWAY, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: routing.model,
                  stream: true,
                  messages: [{ role: "system", content: systemPrompt }, ...body.messages],
                }),
              });

              if (!upstream.ok || !upstream.body) {
                if (upstream.status === 429) {
                  emit({ type: "error", message: "Rate limit reached. Slow down a moment." });
                } else if (upstream.status === 402) {
                  emit({ type: "error", message: "AI credits exhausted. Add credits in Workspace Settings." });
                } else {
                  const t = await upstream.text().catch(() => "");
                  emit({ type: "error", message: t || "Gateway error" });
                }
                emit({ type: "phase", phase: "done" });
                controller.close();
                return;
              }

              const reader = upstream.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              let fullText = "";
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
                    if (typeof delta === "string" && delta.length > 0) {
                      fullText += delta;
                      emit({ type: "delta", content: delta });
                    }
                  } catch {}
                }
              }

              // ── PHASE 5: SELF-CRITIC ──────────────────────────────────────
              // Skip for casual chitchat or empty/short replies.
              const shouldCritique =
                routing.intent !== "casual" && fullText.trim().length > 80;

              if (shouldCritique) {
                emit({ type: "phase", phase: "refining" });
                try {
                  const critique = await gatewayJSON(
                    apiKey,
                    routing.criticModel,
                    [
                      { role: "system", content: CRITIC_SYSTEM },
                      { role: "user", content: buildCriticUserMessage(lastUser, fullText) },
                    ],
                  );
                  const trimmed = critique.trim();
                  // Critic returns "OK" when draft is solid.
                  if (trimmed && trimmed !== "OK" && !/^ok[.!\s]*$/i.test(trimmed) && trimmed.length > 40) {
                    emit({ type: "refined", content: trimmed });
                  }
                } catch {
                  // critic optional — silently skip on failure
                }
              }

              emit({ type: "phase", phase: "done" });
              controller.close();
            } catch (e) {
              emit({ type: "error", message: e instanceof Error ? e.message : "Unknown error" });
              emit({ type: "phase", phase: "done" });
              controller.close();
            }
          },
        });

        return new Response(stream, {
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