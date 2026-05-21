import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  CLASSIFIER_MODEL,
  CLASSIFIER_PROVIDER,
  CLASSIFIER_SYSTEM,
  CRITIC_SYSTEM,
  FALLBACK,
  REASONING_FALLBACK,
  applyRoutingOverrides,
  buildCriticUserMessage,
  buildSystemPrompt,
  parseClassifierOutput,
  parseCriticOutput,
  routeFromIntent,
  selectRelevantMemories,
  shouldAcceptRevision,
} from "@/lib/cortex/orchestrator";
import {
  chatJSON,
  chatStream,
  formatSearchContext,
  providerAvailable,
  tavilySearch,
} from "@/lib/cortex/providers.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const Body = z.object({
  messages: z.array(MessageSchema).min(1),
  memory: z.array(z.string()).default([]),
  internetEnabled: z.boolean().default(false),
});

export const Route = createFileRoute("/api/orchestrate")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // At minimum one upstream provider must be configured.
        if (!providerAvailable("groq") && !providerAvailable("openrouter")) {
          return new Response(JSON.stringify({ error: "No AI provider configured. Add GROQ_API_KEY or OPENROUTER_API_KEY." }), {
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
                const raw = await chatJSON(
                  CLASSIFIER_PROVIDER,
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
              // Heuristic safety net: keyword + language + length overrides.
              routing = applyRoutingOverrides(routing, lastUser);

              // ── PHASE 2: ROUTE + MEMORY SELECTION ─────────────────────────
              emit({ type: "phase", phase: "routing", model: routing.model, provider: routing.provider });
              const relevantMemories = selectRelevantMemories(body.memory, lastUser, 5);

              emit({
                type: "meta",
                intent: routing.intent,
                mode: routing.mode,
                model: routing.model,
                provider: routing.provider,
                needsSearch: routing.needsSearch,
                memoriesUsed: relevantMemories.length,
                reasoning: routing.reasoning,
              });

              // ── PHASE 3: REAL TAVILY WEB SEARCH ───────────────────────────
              let searchContext = "";
              if (routing.needsSearch && body.internetEnabled) {
                emit({ type: "phase", phase: "searching" });
                const hits = await tavilySearch(lastUser, 5);
                if (hits.length > 0) {
                  searchContext = formatSearchContext(hits);
                  emit({ type: "sources", hits });
                }
              }

              // ── PHASE 4: GENERATE (streamed) ──────────────────────────────
              emit({ type: "phase", phase: "generating", model: routing.model, provider: routing.provider });

              const systemPrompt = buildSystemPrompt(routing.mode, relevantMemories) + searchContext;
              const upstreamMessages = [
                { role: "system" as const, content: systemPrompt },
                ...body.messages,
              ];

              // Primary attempt + fallback if primary provider/model fails.
              let upstream: Response;
              let activeModel = routing.model;
              let activeProvider = routing.provider;
              try {
                upstream = await chatStream(routing.provider, routing.model, upstreamMessages);
                if (!upstream.ok) throw new Error(`primary_${upstream.status}`);
              } catch (primaryErr) {
                // Reasoning-heavy intents fall back to a strong model first; only
                // casual chat falls back to the lightweight workhorse.
                const isReasoning =
                  routing.intent !== "casual" && routing.intent !== "productivity";
                const preferred = isReasoning ? REASONING_FALLBACK : FALLBACK;
                const chain = [preferred, FALLBACK].filter(
                  (f, i, arr) =>
                    providerAvailable(f.provider) &&
                    f.model !== routing.model &&
                    arr.findIndex((x) => x.model === f.model) === i,
                );
                if (chain.length === 0) throw primaryErr;
                let lastErr: unknown = primaryErr;
                let ok = false;
                for (const fb of chain) {
                  try {
                    emit({ type: "fallback", from: activeModel, to: fb.model, provider: fb.provider });
                    upstream = await chatStream(fb.provider, fb.model, upstreamMessages);
                    if (!upstream.ok) throw new Error(`fallback_${upstream.status}`);
                    activeModel = fb.model;
                    activeProvider = fb.provider;
                    emit({ type: "phase", phase: "generating", model: activeModel, provider: activeProvider });
                    ok = true;
                    break;
                  } catch (e) {
                    lastErr = e;
                  }
                }
                if (!ok) throw lastErr;
              }

              if (!upstream.ok || !upstream.body) {
                if (upstream.status === 429) {
                  emit({ type: "error", message: "Rate limit reached. Slow down a moment." });
                } else if (upstream.status === 401 || upstream.status === 403) {
                  emit({ type: "error", message: `${activeProvider} rejected the API key. Update it in settings.` });
                } else {
                  const t = await upstream.text().catch(() => "");
                  emit({ type: "error", message: t.slice(0, 300) || `${activeProvider} error ${upstream.status}` });
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

              // ── PHASE 5: SELF-CRITIC (conservative) ───────────────────────
              // Only critique factual/reasoning-heavy intents and longer drafts.
              // Creative/casual replies are left alone — refining them tends to
              // distort tone and meaning.
              const shouldCritique =
                (routing.intent === "research" ||
                  routing.intent === "coding" ||
                  routing.intent === "study") &&
                fullText.trim().length > 200;

              if (shouldCritique) {
                emit({ type: "phase", phase: "refining" });
                try {
                  const critique = await chatJSON(
                    routing.criticProvider,
                    routing.criticModel,
                    [
                      { role: "system", content: CRITIC_SYSTEM },
                      { role: "user", content: buildCriticUserMessage(lastUser, fullText) },
                    ],
                    1500,
                  );
                  const verdict = parseCriticOutput(critique);
                  if (
                    verdict.verdict === "revise" &&
                    shouldAcceptRevision(fullText, verdict.revised, verdict.confidence)
                  ) {
                    emit({ type: "refined", content: verdict.revised.trim(), issue: verdict.issue });
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