"use client";

import { useState } from "react";

export default function AssistantClient() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText: input,
          emotion: "HAPPY", // placeholder
          heartRate: 75, // placeholder
          spO2: 98, // placeholder
        }),
      });

      const data = await res.json();
      setReply(data.reply);
    } catch (err) {
      console.error(err);
      setReply("Error sending to Gemini.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4 border rounded-lg">
      <h2 className="text-xl font-semibold">MindEase AI Assistant (Gemini)</h2>
      <textarea
        className="w-full p-2 border rounded-md"
        rows={3}
        placeholder="Type your thoughts..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={handleSend}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        {loading ? "Thinking..." : "Send"}
      </button>
      {reply && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md text-gray-800">
          <strong>Assistant:</strong> {reply}
        </div>
      )}
    </div>
  );
}
