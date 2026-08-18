import React, { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
import { 
  Bold, Italic, Underline, List, ListOrdered, Link, 
  Superscript, Subscript, Table2, Code, Terminal, Minus,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Heading
} from "lucide-react";

interface VisualEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function VisualEditor({ value, onChange }: VisualEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize Turndown
  const turndownService = useRef<TurndownService | null>(null);
  if (!turndownService.current) {
    const service = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
      strongDelimiter: "**",
    });
    // Prevent Turndown from escaping Markdown characters (such as \ and _ in equations)
    service.escape = (text) => text;
    
    // Add rules to preserve complex elements
    service.keep(["table", "thead", "tbody", "tr", "th", "td", "span", "div", "sup", "sub", "hr", "pre", "code"]);
    turndownService.current = service;
  }

  // Convert Markdown to HTML for the editor
  const getHtmlContent = (markdown: string) => {
    try {
      return marked.parse(markdown) as string;
    } catch (e) {
      console.error("Marked parsing error:", e);
      return markdown;
    }
  };

  useEffect(() => {
    if (editorRef.current && !isMounted) {
      editorRef.current.innerHTML = getHtmlContent(value);
      setIsMounted(true);
    }
  }, [value, isMounted]);

  const handleInput = () => {
    if (editorRef.current && turndownService.current) {
      const html = editorRef.current.innerHTML;
      const markdown = turndownService.current.turndown(html);
      onChange(markdown);
    }
  };

  const executeCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const handleAddLink = () => {
    const url = prompt("Havola (URL) manzilini kiriting:");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleInsertTable = () => {
    const tableHTML = `<table class="min-w-full divide-y divide-border border rounded-xl my-4">
      <thead>
        <tr class="bg-muted/40">
          <th class="border px-4 py-2 text-left font-bold text-xs uppercase">Ustun 1</th>
          <th class="border px-4 py-2 text-left font-bold text-xs uppercase">Ustun 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border px-4 py-2 text-sm">Qiymat 1</td>
          <td class="border px-4 py-2 text-sm">Qiymat 2</td>
        </tr>
      </tbody>
    </table><p></p>`;
    executeCommand("insertHTML", tableHTML);
  };

  const handleInsertCodeBlock = () => {
    const selectedText = window.getSelection()?.toString() || "kod shu yerda";
    const codeBlockHTML = `<pre class="my-5 rounded-xl border border-border p-4 bg-muted/30 font-mono text-sm overflow-x-auto"><code>${selectedText}</code></pre><p></p>`;
    executeCommand("insertHTML", codeBlockHTML);
  };

  const handleInsertInlineCode = () => {
    const selectedText = window.getSelection()?.toString() || "kod";
    const inlineCodeHTML = `<code class="bg-muted px-1.5 py-0.5 rounded font-mono text-[0.85em]">${selectedText}</code>`;
    executeCommand("insertHTML", inlineCodeHTML);
  };

  return (
    <div className="flex flex-col border border-border rounded-xl bg-background overflow-hidden min-h-[500px]">
      {/* Visual Toolbar */}
      <div className="flex flex-wrap gap-1.5 items-center bg-muted/40 p-2.5 border-b border-border/60">
        
        {/* Undo / Redo */}
        <button
          type="button"
          title="Orqaga qaytarish (Undo)"
          onClick={() => executeCommand("undo")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Oldinga qaytarish (Redo)"
          onClick={() => executeCommand("redo")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        {/* Heading Dropdown */}
        <div className="flex items-center gap-1">
          <Heading className="w-3.5 h-3.5 text-muted-foreground" />
          <select 
            onChange={(e) => executeCommand("formatBlock", e.target.value)}
            className="bg-transparent text-xs font-semibold px-1 py-0.5 rounded border border-border/60 text-muted-foreground hover:text-foreground outline-none focus:ring-0 cursor-pointer"
            defaultValue="P"
          >
            <option value="P">Oddiy matn</option>
            <option value="H1">Sarlavha 1</option>
            <option value="H2">Sarlavha 2</option>
            <option value="H3">Sarlavha 3</option>
            <option value="H4">Sarlavha 4</option>
            <option value="H5">Sarlavha 5</option>
            <option value="H6">Sarlavha 6</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        {/* Basic formatting */}
        <button
          type="button"
          title="Qalin (Bold)"
          onClick={() => executeCommand("bold")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors font-bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Kursiv (Italic)"
          onClick={() => executeCommand("italic")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Ostiga chizish (Underline)"
          onClick={() => executeCommand("underline")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          title="Chapdan tekislash"
          onClick={() => executeCommand("justifyLeft")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Markazdan tekislash"
          onClick={() => executeCommand("justifyCenter")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="O'ngdan tekislash"
          onClick={() => executeCommand("justifyRight")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        {/* Lists */}
        <button
          type="button"
          title="Oddiy ro'yxat"
          onClick={() => executeCommand("insertUnorderedList")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Raqamli ro'yxat"
          onClick={() => executeCommand("insertOrderedList")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        {/* Math Exponent & Index (Superscript/Subscript) */}
        <button
          type="button"
          title="Matematik daraja (Superscript / Exponent)"
          onClick={() => executeCommand("superscript")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Superscript className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Matematik indeks (Subscript)"
          onClick={() => executeCommand("subscript")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Subscript className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        {/* Inserts */}
        <button
          type="button"
          title="Havola qo'yish (Link)"
          onClick={handleAddLink}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Link className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Jadval qo'shish"
          onClick={handleInsertTable}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Table2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Kod bloki (Code block)"
          onClick={handleInsertCodeBlock}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Satrli kod (Inline code)"
          onClick={handleInsertInlineCode}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Gorizontal chiziq (HR)"
          onClick={() => executeCommand("insertHorizontalRule")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-5 min-h-[450px] outline-none prose prose-sm max-w-none focus:ring-0 overflow-y-auto"
        style={{ minHeight: "450px" }}
      />
    </div>
  );
}
