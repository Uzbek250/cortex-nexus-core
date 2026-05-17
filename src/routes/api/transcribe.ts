import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

// Real Groq Whisper speech-to-text. Accepts multipart/form-data with an
// "audio" file field. Returns { text }.
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const key = process.env.GROQ_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "GROQ_API_KEY missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const audio = form.get("audio");
        if (!(audio instanceof Blob)) {
          return new Response(JSON.stringify({ error: "Missing audio field" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        // Hard cap ~25MB Groq Whisper limit; protect against abuse.
        if (audio.size > 25 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "Audio too large (max 25MB)" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = new FormData();
        upstream.append("file", audio, "audio.webm");
        upstream.append("model", "whisper-large-v3-turbo");
        upstream.append("response_format", "json");
        const lang = form.get("language");
        if (typeof lang === "string" && lang) upstream.append("language", lang);

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return new Response(JSON.stringify({ error: t.slice(0, 300) || `groq_${res.status}` }), {
            status: res.status,
            headers: { "Content-Type": "application/json" },
          });
        }
        const j = (await res.json()) as { text?: string };
        return new Response(JSON.stringify({ text: j.text ?? "" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});