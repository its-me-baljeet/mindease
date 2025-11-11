"use client";

import { useState } from "react";

export default function EmotionKeyPage() {
  const [key, setKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateKey() {
    setLoading(true);
    try {
      const res = await fetch("/api/emotion/key", { method: "POST" });
      const data = await res.json();
      if (res.ok) setKey(data.apiKey);
      else alert(data.error || "Failed to generate key");
    } catch (e) {
      console.error(e);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!key) return;
    await navigator.clipboard.writeText(key);
    alert("Copied!");
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Facial Emotion Device Key</h1>
      <p className="text-sm text-zinc-500">
        Generate a one-time device key for your Python DeepFace script. Store it safely.
      </p>

      <button
        onClick={generateKey}
        disabled={loading}
        className="rounded-xl bg-blue-600 text-white px-4 py-2"
      >
        {loading ? "Generating..." : "Generate / Rotate Key"}
      </button>

      {key && (
        <div className="border rounded-xl p-4 space-y-2">
          <div className="text-xs text-zinc-500">Your new device key (shown once):</div>
          <code className="block break-all p-2 bg-zinc-100 rounded">{key}</code>
          <button onClick={copy} className="rounded-lg bg-zinc-900 text-white px-3 py-1">
            Copy
          </button>
        </div>
      )}

      <div className="text-sm text-zinc-600">
        Use this in your Python script header as: <code>EMOTION_API_KEY = `{key}`</code>
      </div>
    </main>
  );
}
