import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, User } from "lucide-react";
import { CortexLogo } from "./CortexLogo";
import { cn } from "@/lib/utils";

export function Message({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}) {
  if (role === "system") return null;
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="shrink-0 mt-1">
          <CortexLogo size={28} animated={false} />
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "glass-input bg-primary/10 border-primary/20 text-foreground"
            : "glass text-foreground/95",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <MarkdownBody content={content} />
        )}
        {streaming && (
          <span className="inline-flex items-center gap-1 ml-1 align-middle">
            <span className="w-1 h-1 rounded-full bg-primary thinking-dot" style={{ animationDelay: "0s" }} />
            <span className="w-1 h-1 rounded-full bg-primary thinking-dot" style={{ animationDelay: "0.2s" }} />
            <span className="w-1 h-1 rounded-full bg-primary thinking-dot" style={{ animationDelay: "0.4s" }} />
          </span>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 mt-1 w-7 h-7 rounded-full glass-input flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-foreground prose-headings:font-medium prose-code:text-primary prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:hidden prose-code:after:hidden prose-pre:bg-transparent prose-pre:p-0 prose-a:text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ inline, className, children, ...rest }: any) => {
            if (inline) {
              return <code className={className} {...rest}>{children}</code>;
            }
            const lang = /language-(\w+)/.exec(className || "")?.[1] ?? "code";
            return <CodeBlock language={lang}>{String(children).replace(/\n$/, "")}</CodeBlock>;
          },
        }}
      >
        {content || " "}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/40 bg-black/40">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{language}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 hover:text-primary transition"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs text-foreground/90">
        <code>{children}</code>
      </pre>
    </div>
  );
}
