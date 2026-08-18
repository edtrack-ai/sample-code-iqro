import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import "katex/dist/katex.min.css";

function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");
  const lineCount = code.split("\n").length;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 rounded-xl border border-border overflow-hidden not-prose">
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(230,20%,13%)] border-b border-border/60">
        <span className="text-[11px] font-mono font-medium text-muted-foreground/80 uppercase tracking-widest">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          background: "hsl(230, 25%, 9%)",
          fontSize: "0.8125rem",
          lineHeight: "1.75",
        }}
        showLineNumbers={lineCount > 3}
        lineNumberStyle={{ color: "hsl(220,10%,28%)", minWidth: "2.5em", paddingRight: "1em" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Preprocess content to convert LaTeX delimiters: \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
  let processed = content || "";
  processed = processed
    .replace(/\\\[(.*?)\\\]/gs, "$$$1$$")
    .replace(/\\\((.*?)\\\)/gs, "$$1$");

  // Clean up spaces next to bold asterisks so that standard Markdown parses it correctly
  const sanitizedContent = processed
    .replace(/\*\*\s+(.*?)\s+\*\*/g, "**$1**")
    .replace(/\*\*\s+(.*?)\*\*/g, "**$1**")
    .replace(/\*\*(.*?)\s+\*\*/g, "**$1**");

  return (
    <div className={cn(
      "prose prose-lg max-w-none",
      // Headings
      "prose-headings:font-bold prose-headings:text-primary dark:prose-headings:text-primary",
      // Body
      "prose-p:text-[#1f2937] dark:prose-p:text-gray-300 prose-p:leading-[1.8]",
      // Lists
      "prose-li:text-[#1f2937] dark:prose-li:text-gray-300",
      // Strong
      "prose-strong:text-primary dark:prose-strong:text-primary",
      // Links
      "prose-a:text-primary dark:prose-a:text-primary prose-a:underline prose-a:underline-offset-[3px] prose-a:decoration-primary/40 dark:prose-a:decoration-primary/40",
      // Blockquotes
      "prose-blockquote:border-l-gray-300 dark:prose-blockquote:border-l-gray-600 prose-blockquote:not-italic prose-blockquote:text-[#374151] dark:prose-blockquote:text-gray-400",
      // Inline code
      "prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[0.85em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none",
      // HR
      "prose-hr:border-border/40",
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = /language-/.test(className || "") || String(children).includes("\n");
            if (isBlock) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          pre({ children }) {
            return <>{children}</>;
          },
          table({ children }) {
            return (
              <div className="my-5 rounded-xl border border-border overflow-hidden not-prose">
                <Table>{children}</Table>
              </div>
            );
          },
          thead({ children }) {
            return <TableHeader className="bg-gray-50 dark:bg-gray-800/50">{children}</TableHeader>;
          },
          tbody({ children }) {
            return <TableBody>{children}</TableBody>;
          },
          tr({ children }) {
            return <TableRow className="border-border/50">{children}</TableRow>;
          },
          th({ children }) {
            return (
              <TableHead className="font-semibold text-primary dark:text-primary text-xs uppercase tracking-wider py-3">
                {children}
              </TableHead>
            );
          },
          td({ children }) {
            return <TableCell className="text-[#1f2937] dark:text-gray-300 py-3">{children}</TableCell>;
          },
          img({ src, alt }) {
            return (
              <div className="flex flex-col items-center my-8 group">
                <img
                  src={src}
                  alt={alt}
                  className="rounded-2xl shadow-xl max-w-full h-auto border border-border/40 transition-all duration-300 group-hover:shadow-2xl"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      target.style.display = 'none';
                      const placeholder = document.createElement('div');
                      placeholder.className = "w-full max-w-md aspect-video rounded-2xl bg-muted/30 border border-dashed border-border/60 flex flex-col items-center justify-center gap-3 p-6 text-center";
                      placeholder.innerHTML = `
                        <div class="p-3 rounded-full bg-muted/50 text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                        <p class="text-xs font-medium text-muted-foreground/80 leading-relaxed">${alt || 'Image Preview'}</p>
                      `;
                      parent.appendChild(placeholder);
                    }
                  }}
                />
                {alt && <p className="mt-3 text-[11px] font-medium text-muted-foreground/60 italic px-4 py-1.5 rounded-full bg-muted/20 border border-border/10">{alt}</p>}
              </div>
            );
          },
          a({ href, children }) {
            const youtubeId = href ? getYoutubeId(href) : null;
            if (youtubeId) {
              return (
                <div className="my-8 space-y-3">
                  <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-2xl border border-border/40 bg-black/5 relative group">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                  <div className="flex justify-end">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/70 hover:text-primary transition-colors no-underline px-3 py-1 rounded-full bg-primary/5 border border-primary/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                      Open on YouTube
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
