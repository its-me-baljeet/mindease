// components/assistant/assistant-client.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AssistantClientProps = {
  externalSupportMessage?: string | null;
};

export default function AssistantClient({
  externalSupportMessage,
}: AssistantClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi, I'm MindEase. How are you feeling today? 😊",
    },
  ]);

  const [input, setInput] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Function to append a new message
  const addMessage = useCallback(
    (content: string, role: "assistant" | "user") => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${role}-${Date.now()}`,
          role,
          content,
        },
      ]);
    },
    []
  );

  // Handle external support AI summary message
  useEffect(() => {
    if (externalSupportMessage) {
      Promise.resolve().then(() =>
        addMessage(externalSupportMessage, "assistant")
      );
    }
  }, [externalSupportMessage, addMessage]);

  // Handle user sending a message
  const sendMessage = async () => {
    if (!input.trim() || loadingResponse) return;

    const userMessage = input.trim();
    setInput("");
    addMessage(userMessage, "user");

    try {
      setLoadingResponse(true);

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      if (data.reply) addMessage(data.reply, "assistant");
    } catch (err) {
      console.error("Chat error:", err);
      addMessage("⚠️ Something went wrong. Please try again.", "assistant");
    } finally {
      setLoadingResponse(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Chat Window */}
      <div
        ref={chatBoxRef}
        className="h-80 overflow-y-auto p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 space-y-3"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            } animate-[slideUp_0.3s_ease-out]`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-lg ${
                m.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  : "bg-zinc-800/80 text-zinc-100"
              }`}
            >
              <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* AI is thinking indicator */}
        {loadingResponse && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-zinc-800/80 rounded-2xl animate-pulse">
              <p className="text-sm text-zinc-400">Assistant is thinking…</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loadingResponse}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loadingResponse}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/30"
        >
          {loadingResponse ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}