import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, User, Code2, Languages, Calculator, MessageCircle, Quote, Plus, Mic, ChevronDown, Maximize2, Minimize2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TextSelectionPopover } from "@/components/TextSelectionPopover";
import { roadmapApi, ApiError, getErrorMessage, type ChatHistoryItem } from "@/lib/api";
import { CreditAlert } from "@/components/CreditAlert";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/authStore";
import { AudioPlayer } from "@/components/AudioPlayer";

type ChatMode = "general" | "math" | "coding" | "language";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  id: string;
  contextText?: string;
  playgroundCode?: string;
  attachments?: {
    id?: number;
    url: string;
    original_name?: string;
    name?: string;
    type?: string;
    file_type?: string;
  }[];
}

interface ChatPanelProps {
  lessonId: number;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

export function ChatPanel({ lessonId, initialQuery, onClearInitialQuery }: ChatPanelProps) {
  const t = useI18n((s) => s.t);
  const setCreditBalance = useAuthStore((s) => s.setCreditBalance);

  const modes: { id: ChatMode; label: string; icon: React.ReactNode; systemHint: string }[] = [
    { id: "math", label: t("chat.math"), icon: <Calculator className="w-3.5 h-3.5" />, systemHint: "Respond using LaTeX math notation wrapped in $...$ or $$...$$ for formulas. " },
    { id: "coding", label: t("chat.coding"), icon: <Code2 className="w-3.5 h-3.5" />, systemHint: "Provide runnable code snippets with explanations. " },
    { id: "language", label: t("chat.language"), icon: <Languages className="w-3.5 h-3.5" />, systemHint: "Focus on translations, grammar breakdowns, and linguistic analysis. " },
  ];

  const [chatMode, setChatMode] = useState<ChatMode>("math");
  const [chatQuery, setChatQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Streaming simulation typing effect variables
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingTargetContent, setStreamingTargetContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [creditError, setCreditError] = useState<string | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isStreaming || streamingContent === streamingTargetContent) return;
    const interval = setInterval(() => {
      setStreamingContent((prev) => {
        if (prev === streamingTargetContent) { clearInterval(interval); return prev; }
        const gap = streamingTargetContent.length - prev.length;
        const increment = gap > 100 ? 5 : gap > 20 ? 3 : 1;
        return streamingTargetContent.slice(0, prev.length + increment);
      });
    }, 15);
    return () => clearInterval(interval);
  }, [isStreaming, streamingTargetContent, streamingContent]);

  const startTypingEffect = useCallback((fullText: string) => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingTargetContent(fullText);
  }, []);

  useEffect(() => {
    if (isStreaming && streamingTargetContent && streamingContent === streamingTargetContent && !chatLoading) {
      const timeout = setTimeout(() => {
        setIsStreaming(false);
        setMessages((prev) => [...prev, { role: "ai", content: streamingTargetContent, id: `ai-msg-${Date.now()}` }]);
        setStreamingContent("");
        setStreamingTargetContent("");
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isStreaming, streamingContent, streamingTargetContent, chatLoading]);

  useEffect(() => { return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current); }; }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (isExpanded) {
      el.style.height = "320px";
      el.style.overflowY = "auto";
      return;
    }
    el.style.height = "auto";
    const currentScrollHeight = el.scrollHeight;
    if (currentScrollHeight > 120) {
      el.style.height = "120px";
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${currentScrollHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, [chatQuery, isExpanded]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  useEffect(() => {
    if (historyLoaded || !lessonId) return;
    const loadHistory = async () => {
      try {
        const history = await roadmapApi.getChatHistory(lessonId);
        if (history.length > 0) {
          const cleanSystemPrompts = (text: string) => {
            if (!text) return "";
            return text
              .replace(/^Respond using LaTeX math notation wrapped in \$\.\.\.\$ or \$\$\.\.\.\$ for formulas\.\s*/i, "")
              .replace(/^Provide runnable code snippets with explanations\.\s*/i, "")
              .replace(/^Focus on translations, grammar breakdowns, and linguistic analysis\.\s*/i, "");
          };

          const historyMsgs: ChatMessage[] = [];
          history.forEach((item: ChatHistoryItem, i: number) => {
            historyMsgs.push({ 
              role: "user", 
              content: cleanSystemPrompts(item.user_msg), 
              id: `hist-u-${i}`,
              attachments: item.attachments 
            });
            historyMsgs.push({ role: "ai", content: item.ai_msg, id: `hist-a-${i}` });
          });
          setMessages(historyMsgs);
        }
      } catch {}
      setHistoryLoaded(true);
    };
    loadHistory();
  }, [lessonId, historyLoaded]);

  useEffect(() => {
    if (initialQuery) {
      setChatQuery(initialQuery);
      inputRef.current?.focus();
      onClearInitialQuery?.();
    }
  }, [initialQuery, onClearInitialQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      const totalSize = filesArr.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > 20 * 1024 * 1024) {
        toast({ title: "Files too large", description: "Maximum total size is 20MB", variant: "destructive" });
        return;
      }
      setSelectedFiles((prev) => [...prev, ...filesArr].slice(0, 5)); // max 5 files
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `Voice_Note_${new Date().toISOString().replace(/:/g, "-")}.webm`, { type: "audio/webm" });
        setSelectedFiles((prev) => {
          if (prev.length >= 5) {
            toast({ title: "Limit Reached", description: "Maximum of 5 files allowed.", variant: "destructive" });
            return prev;
          }
          return [...prev, audioFile];
        });
        
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Microphone Error", description: "Please allow microphone permissions to record audio.", variant: "destructive" });
    }
  };

  const handleChat = async () => {
    const query = chatQuery.trim();
    if (!query && selectedFiles.length === 0) return;
    if (chatLoading || isStreaming) return;

    const contextMatch = query.match(/^Explain this: "(.+)"$/s);
    const selectedText = contextMatch ? contextMatch[1] : "";
    
    // Add User Message to UI instantly
    const tempAttachments = selectedFiles.map((file, i) => ({
      id: Date.now() + i,
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type
    }));

    const cleanQuery = query
      .replace(/^Respond using LaTeX math notation wrapped in \$\.\.\.\$ or \$\$\.\.\.\$ for formulas\.\s*/i, "")
      .replace(/^Provide runnable code snippets with explanations\.\s*/i, "")
      .replace(/^Focus on translations, grammar breakdowns, and linguistic analysis\.\s*/i, "");

    const userMsg: ChatMessage = { 
      role: "user", 
      content: cleanQuery, 
      id: `user-${Date.now()}`, 
      contextText: selectedText || undefined,
      attachments: tempAttachments
    };
    setMessages((prev) => [...prev, userMsg]);
    
    // Reset inputs
    setChatQuery("");
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);
    
    if (inputRef.current) inputRef.current.style.height = "auto";
    setChatLoading(true);

    const modeHint = modes.find((m) => m.id === chatMode)?.systemHint || "";
    const fullQuery = modeHint + (contextMatch ? `Explain this: "${selectedText}"` : query);

    const formData = new FormData();
    formData.append("user_query", fullQuery);
    if (selectedText) formData.append("selected_text", selectedText);
    filesToUpload.forEach(file => formData.append("files", file));

    try {
      const res = await roadmapApi.multimodalChatLesson(lessonId, formData);
      setCreditBalance(res.new_balance); // Dynamically update globally persisted balance
      toast({
        title: "Gemini Tokens Processed",
        description: `Used ${res.usage_details.tokens} tokens (-${res.usage_details.credits_spent.toFixed(3)} credits)`,
      });
      startTypingEffect(res.text_explanation);
    } catch (err) {
      if (err instanceof ApiError && err.isPaymentRequired) { 
        setCreditError(err.detail); 
      } else { 
        toast({ title: t("chat.chatError"), description: getErrorMessage(err), variant: "destructive" }); 
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") {
      e.stopPropagation();
      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      handleChat(); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5 bg-card/60 backdrop-blur-sm">
        <div className="p-1.5 rounded-lg bg-primary/10"><Sparkles className="w-4 h-4 text-primary" /></div>
        <span className="text-sm font-bold font-display flex-1">{t("chat.aiAssistant")}</span>
      </div>
      <div ref={messagesContainerRef} className="flex-1 overflow-auto px-4 py-5 space-y-5 relative min-h-0">
        <TextSelectionPopover containerRef={messagesContainerRef as React.RefObject<HTMLElement>} onAskAI={(text) => { setChatQuery(`Explain this: "${text}"`); inputRef.current?.focus(); }} />
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/40"><MessageCircle className="w-8 h-8 text-muted-foreground/40" /></div>
            <p className="text-sm font-semibold text-muted-foreground">{t("chat.askAnything")}</p>
            <p className="text-xs text-muted-foreground/60 max-w-[240px] leading-relaxed">{t("chat.selectText")}</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "ai" && (<div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 ring-1 ring-primary/10"><Sparkles className="w-3.5 h-3.5 text-primary" /></div>)}
              <div className={`max-w-[85%] min-w-0 ${msg.role === "user" ? "flex flex-col items-end gap-1.5" : "flex-1"}`}>
                {msg.role === "user" && msg.contextText && (
                  <div className="flex items-start gap-2 bg-muted/50 border border-border/50 rounded-xl px-3 py-2 max-w-full">
                    <Quote className="w-3 h-3 text-primary/50 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground italic line-clamp-3 break-words" style={{ overflowWrap: "anywhere" }}>{msg.contextText}</p>
                  </div>
                )}
                {msg.role === "user" ? (
                  <div className="flex flex-col items-end gap-1.5 w-full">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap items-end justify-end gap-2 mb-1 w-full">
                        {msg.attachments.map((att, idx) => {
                          const attType = att.type || att.file_type || "";
                          const isImage = attType.startsWith("image/");
                          const name = att.name || att.original_name || "Attachment";
                          const isAudio = attType.startsWith("audio/") || name.endsWith(".webm") || name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".m4a");
                          const attUrl = att.url || (att as any).file || "";
                          const url = attUrl ? (attUrl.startsWith("blob:") || attUrl.startsWith("http") ? attUrl : `${import.meta.env.VITE_API_URL || "https://api.iqro.online"}${attUrl}`) : "";

                          if (isAudio) {
                            return (
                              <div key={idx} className="w-full flex justify-end mt-1 z-10 drop-shadow-sm">
                                <AudioPlayer url={url} name={name} compact />
                              </div>
                            );
                          }

                          if (isImage) {
                            return (
                              <div key={idx} onClick={() => setLightboxImage(url)} className="relative group rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm cursor-pointer max-w-[200px] max-h-[160px] bg-black/5">
                                <img src={url} alt={name} className="w-auto h-auto max-w-full max-h-[160px] object-contain object-right hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                                </div>
                              </div>
                            );
                          }
                          return (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs px-3 py-2 rounded-xl backdrop-blur-sm transition-colors shadow-sm w-max border border-primary/10">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="max-w-[150px] truncate font-semibold">{name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {msg.content && (
                      <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm" style={{ overflowWrap: "anywhere" }}>
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.contextText ? t("chat.explainThis") : msg.content}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card/80 rounded-2xl rounded-tl-sm px-4 py-3.5 border border-border/50 shadow-sm" style={{ overflowWrap: "anywhere" }}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed && typeof parsed === 'object' && parsed.error) {
                          return <p className="text-sm leading-relaxed text-destructive/80 font-medium">{parsed.error}</p>;
                        }
                      } catch {}
                      return <MarkdownRenderer content={msg.content} className="text-[0.8125rem]" />;
                    })()}
                  </div>
                )}
              </div>
              {msg.role === "user" && (<div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center shrink-0 mt-1"><User className="w-3.5 h-3.5 text-primary-foreground" /></div>)}
            </motion.div>
          ))}
        </AnimatePresence>
        {isStreaming && streamingContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 ring-1 ring-primary/10"><Sparkles className="w-3.5 h-3.5 text-primary" /></div>
            <div className="flex-1 bg-card/80 rounded-2xl rounded-tl-sm px-4 py-3.5 border border-border/50 shadow-sm min-w-0" style={{ overflowWrap: "anywhere" }}>
              {(() => {
                try {
                  if (streamingContent.startsWith('{')) {
                    const parsed = JSON.parse(streamingContent);
                    if (parsed && typeof parsed === 'object' && parsed.error) {
                      return <p className="text-sm leading-relaxed text-destructive/80 font-medium">{parsed.error}</p>;
                    }
                  }
                } catch {
                  const match = streamingContent.match(/"error":\s*"([^"]*)/);
                  if (match) return <p className="text-sm leading-relaxed text-destructive/80 font-medium">{match[1]}</p>;
                }
                return <MarkdownRenderer content={streamingContent} className="text-[0.8125rem]" />;
              })()}
              <span className="streaming-cursor-chat" />
            </div>
          </motion.div>
        )}
        {chatLoading && !streamingContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/10"><Sparkles className="w-3.5 h-3.5 text-primary" /></div>
            <div className="bg-card/80 rounded-2xl rounded-tl-sm px-4 py-3.5 border border-border/50 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">{[0,1,2].map((i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />))}</div>
                <span className="text-xs text-muted-foreground">{t("chat.thinking")}</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>
      {creditError && (<div className="px-3 pt-2"><CreditAlert message={creditError} onDismiss={() => setCreditError(null)} /></div>)}
      <div className="p-3 border-t border-border/60 bg-card/40">
        <div className="chat-input-glow">
          <div className="flex flex-col bg-card rounded-2xl px-3 py-2.5 transition-all gap-2 overflow-visible relative z-10">
            
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1 px-1">
                {selectedFiles.map((file, i) => {
                  const isImage = file.type.startsWith("image/");
                  const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".webm");
                  
                  if (isAudio) {
                    return (
                      <div key={i} className="relative group shrink-0">
                        <AudioPlayer url={URL.createObjectURL(file)} name={file.name} sizeBytes={file.size} compact />
                        <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="absolute -top-2 -right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10 shadow-sm opacity-0 group-hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className={`relative flex items-center gap-1.5 bg-muted/60 rounded-md border border-border/50 group overflow-hidden ${isImage ? 'p-0 w-16 h-16 shrink-0' : 'px-2.5 py-1 text-xs'}`}>
                      {isImage ? (
                         <>
                           <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                         </>
                      ) : (
                         <>
                           <Paperclip className="w-3 h-3 text-muted-foreground" />
                           <span className="max-w-[120px] truncate text-muted-foreground font-medium">{file.name}</span>
                           <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground/60 hover:text-foreground">
                             <X className="w-3 h-3" />
                           </button>
                         </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <textarea 
              ref={inputRef} 
              value={chatQuery} 
              onChange={(e) => setChatQuery(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder={t("chat.askAboutLesson")} 
              rows={1} 
              className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/40 text-foreground leading-relaxed break-words whitespace-pre-wrap min-h-[40px] py-2" 
            />
            
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,application/pdf,audio/*"
            />
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground/50 hover:bg-muted/30 hover:text-foreground transition-colors"
                title="Attach Media / PDF"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>



              <div className="flex-1" />

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground/70 hover:bg-muted/30 transition-colors"
                title={isExpanded ? "Collapse input" : "Expand input"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleRecording}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${isRecording ? "bg-destructive/10 text-destructive border-destructive/30 animate-pulse" : "border-border/60 text-muted-foreground hover:bg-muted/30"}`}
                title={isRecording ? "Stop Recording" : "Start Voice Recording"}
              >
                <Mic className="w-3.5 h-3.5" />
                {isRecording ? "Recording..." : "Voice"}
              </button>

              <Button size="icon" onClick={handleChat} disabled={chatLoading || (!chatQuery.trim() && selectedFiles.length === 0)} className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm">
                {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
          <button 
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }} 
            className="absolute top-6 right-6 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20 transition-all shadow-lg select-none z-50 focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Expanded view" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
