// components/charts/emotion-chart.tsx
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

type ChartDataPoint = {
  t: string;
  score: number;
  emotion: string;
};

const EMO_SCORE: Record<NonNullable<Row["emotion"]>, number> = {
  NEUTRAL: 40,
  HAPPY: 20,
  SAD: 65,
  ANGRY: 75,
  STRESSED: 85,
};

function scoreFromEmotion(e: Row["emotion"]): number {
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
    if (!userId) return;

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
          if (userId && msg.userId !== userId) return;
          setRows((prev) => [...prev, msg.row].slice(-200));
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
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

  const data: ChartDataPoint[] = useMemo(() => {
    return rows.map((r) => ({
      t: new Date(r.timestamp).toLocaleTimeString(),
      score: scoreFromEmotion(r.emotion),
      emotion: r.emotion ?? "NONE",
    }));
  }, [rows]);

  return (
    <div className="w-full">
      <div className="h-72 bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="t"
              stroke="#71717a"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#71717a"
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#colorGradient)"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Stress Score: Lower is better • HAPPY≈20 • NEUTRAL≈40 • SAD≈65 • ANGRY≈75
        • STRESSED≈85
      </p>
    </div>
  );
}