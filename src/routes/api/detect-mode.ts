import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ text: z.string().min(1).max(2000) });

export const Route = createFileRoute("/api/detect-mode")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ mode: "auto" });

        let text = "";
        try {
          const raw = await request.json();
          text = Body.parse(raw).text;
        } catch {
          return Response.json({ mode: "auto" });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content:
                  'Classify the user message into ONE mode: study, creative, builder, critic, research, or auto. Reply with ONLY the single lowercase word.',
              },
              { role: "user", content: text },
            ],
          }),
        });

        if (!res.ok) return Response.json({ mode: "auto" });
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = json.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "auto";
        const allowed = ["study", "creative", "builder", "critic", "research", "auto"];
        return Response.json({ mode: allowed.includes(raw) ? raw : "auto" });
      },
    },
  },
});
