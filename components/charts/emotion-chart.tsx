"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@clerk/nextjs";

type Row = {
  id: string;
  timestamp: string;
  emotion: "NEUTRAL" | "HAPPY" | "SAD" | "ANGRY" | "STRESSED" | null;
};

const EMO_SCORE: Record<NonNullable<Row["emotion"]>, number> = {
  NEUTRAL: 40,
  HAPPY: 20,
  SAD: 65,
  ANGRY: 75,
  STRESSED: 85,
};

function scoreFromEmotion(e: Row["emotion"]) {
  if (!e) return 50;
  return EMO_SCORE[e] ?? 50;
}

export default function EmotionChart() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/emotion/latest?limit=50", {
        cache: "no-store",
      });
      const data = await res.json();
      if (active) setRows(data);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live WS
  useEffect(() => {
    if (!userId) return; // Don't connect if no user logged in

    // connect once
    const ws = new WebSocket(
      (location.protocol === "https:" ? "wss://" : "ws://") +
        location.host +
        "/api/emotion/ws"
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Emotion WebSocket connected");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === "emotion" && msg?.userId && msg?.timestamp) {
          // Only accept events for current user
          if (userId && msg.userId !== userId) return;
          setRows((prev) => [...prev, msg.row].slice(-200));
        }
      } catch {}
    };

    ws.onerror = (err) => {
      console.error("❌ Emotion WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("🔌 Emotion WebSocket disconnected");
      wsRef.current = null;
    };

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      ws.close();
    };
  }, [userId]);

  const data = useMemo(() => {
    return rows.map((r) => ({
      t: new Date(r.timestamp).toLocaleTimeString(),
      score: scoreFromEmotion(r.emotion),
      emotion: r.emotion ?? "NONE",
    }));
  }, [rows]);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="score" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 text-sm text-zinc-500">
        Stress Score (emotion-only): lower is better. HAPPY≈20, NEUTRAL≈40,
        SAD≈65, ANGRY≈75, STRESSED≈85.
      </div>
    </div>
  );
}
