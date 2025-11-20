// app/dashboard/dashboard-client.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AssistantClient from "@/components/assistant/assistant-client";
import EmotionChartWrapper from "@/components/charts/emotion-chart-wrapper";
import FormattedDate from "@/components/date/formatted-date";

const CameraEmotionFeed = dynamic(
  () => import("@/components/camera/camera-emotion-feed"),
  { ssr: false }
);

type DataPointLite = {
  id: string;
  timestamp: string; // serialized from server
  heartRate: number | null;
  spO2: number | null;
  emotion: string | null;
};

type DashboardClientProps = {
  latest: DataPointLite[];
};

export default function DashboardClient({ latest }: DashboardClientProps) {
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* 📸 Camera + observation + support */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Live Emotion Detection</h2>
        <CameraEmotionFeed onSupportMessage={setSupportMessage} />
      </section>

      {/* 🩺 Latest readings */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Recent Readings</h2>
        {latest.length === 0 ? (
          <p className="text-zinc-500">No readings yet.</p>
        ) : (
          latest.map((r) => (
            <div key={r.id} className="border-b py-2 text-sm">
              <p>
                <strong>Time:</strong> <FormattedDate timestamp={r.timestamp} />
              </p>
              <p>
                <strong>Heart Rate:</strong> {r.heartRate ?? "-"}
              </p>
              <p>
                <strong>SpO₂:</strong> {r.spO2 ?? "-"}
              </p>
              <p>
                <strong>Emotion:</strong> {r.emotion ?? "-"}
              </p>
            </div>
          ))
        )}
      </section>

      {/* 📊 Trend */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-4">Emotion Trend</h2>
        <EmotionChartWrapper />
      </section>

      {/* 🤖 Assistant */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">AI Assistant</h2>
        <AssistantClient externalSupportMessage={supportMessage} />
      </section>
    </main>
  );
}
