import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "boulevard-chat-session-id";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useChatSession(welcomeMessage: string) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [loaded, setLoaded] = useState(false);
  const sessionId = getOrCreateSessionId();

  // Load existing session on mount
  useEffect(() => {
    async function load() {
      try {
        const cutoff = new Date(Date.now() - SESSION_TTL_MS).toISOString();
        const { data } = await supabase
          .from("chat_sessions")
          .select("messages, updated_at")
          .eq("session_id", sessionId)
          .gte("updated_at", cutoff)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages as Message[]);
        }
      } catch {
        // No session found, use welcome message
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [sessionId]);

  // Save messages to database
  const saveMessages = useCallback(
    async (msgs: Message[]) => {
      if (msgs.length <= 1) return; // Don't save just the welcome message

      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("session_id", sessionId)
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from("chat_sessions")
          .update({ messages: msgs as any, updated_at: new Date().toISOString() })
          .eq("session_id", sessionId);
      } else {
        await supabase
          .from("chat_sessions")
          .insert({ session_id: sessionId, messages: msgs as any });
      }
    },
    [sessionId]
  );

  const resetSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setMessages([{ role: "assistant", content: welcomeMessage }]);
  }, [welcomeMessage]);

  return { messages, setMessages, saveMessages, resetSession, loaded };
}
