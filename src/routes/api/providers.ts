import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

// Reports which upstream providers are configured. Booleans only — never
// echo the actual keys.
export const Route = createFileRoute("/api/providers")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            groq: Boolean(process.env.GROQ_API_KEY),
            openrouter: Boolean(process.env.OPENROUTER_API_KEY),
            tavily: Boolean(process.env.TAVILY_API_KEY),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});