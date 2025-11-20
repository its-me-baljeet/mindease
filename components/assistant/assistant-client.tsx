"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown"; // <-- Install this

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
      content: "Hi, I’m MindEase. How are you feeling today? 😊",
    },
  ]);

  const [input, setInput] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
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

  return (
    <div className="flex flex-col gap-3">
      {/* Chat Window */}
      <div
        ref={chatBoxRef}
        className="border border-zinc-700 rounded-lg p-3 h-72 overflow-y-auto bg-zinc-900 text-sm"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            <span
              className={`inline-block px-3 py-2 rounded-2xl max-w-[80%] wrap-break-word ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </span>
          </div>
        ))}

        {/* 🔁 AI is thinking indicator */}
        {loadingResponse && (
          <div className="text-left mb-2">
            <span className="inline-block px-3 py-2 rounded-2xl bg-zinc-800 text-zinc-400 text-sm animate-pulse">
              Assistant is thinking…
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loadingResponse}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loadingResponse}
          className="px-5 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
        >
          {loadingResponse ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
