import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

type Message = { role: "user" | "assistant"; content: string };

const translations = {
  sq: {
    title: "Pyet Stafin",
    placeholder: "Shkruaj pyetjen tënde...",
    send: "Dërgo",
    thinking: "Po mendoj...",
    welcome: "Përshëndetje! Jam asistenti virtual i Boulevard Café. Si mund t'ju ndihmoj?",
    error: "Ndodhi një gabim. Ju lutem provoni përsëri.",
  },
  en: {
    title: "Ask Staff",
    placeholder: "Type your question...",
    send: "Send",
    thinking: "Thinking...",
    welcome: "Hello! I'm the virtual assistant of Boulevard Café. How can I help you?",
    error: "An error occurred. Please try again.",
  },
};

interface StaffChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffChatDialog({ open, onOpenChange }: StaffChatDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.welcome }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([{ role: "assistant", content: t.welcome }]);
    }
  }, [open, t.welcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/staff-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).map(m => ({
              role: m.role,
              content: m.content
            })),
            language,
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: t.error }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-secondary/20">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-xl font-display gradient-text-gold">
            <Bot className="h-6 w-6 text-secondary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[55vh] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-secondary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/50 text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-secondary" />
                </div>
                <div className="bg-muted/50 px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.thinking}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 pt-2 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t.placeholder}
              disabled={isLoading}
              className="flex-1 bg-muted/30 border-border/50 focus:border-secondary/50"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
