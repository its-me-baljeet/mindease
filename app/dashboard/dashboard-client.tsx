// app/dashboard/dashboard-client.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AssistantClient from "@/components/assistant/assistant-client";
import EmotionChartWrapper from "@/components/charts/emotion-chart-wrapper";
import FormattedDate from "@/components/date/formatted-date";
import Metric from "@/components/ui/metric";
import Card from "@/components/ui/card";

const CameraEmotionFeed = dynamic(
  () => import("@/components/camera/camera-emotion-feed"),
  { ssr: false }
);

type DataPointLite = {
  id: string;
  timestamp: string;
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
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="animate-[fadeIn_0.5s_ease-out]">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-zinc-400">Monitor your emotional wellness in real-time</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Camera & Chart */}
          <div className="lg:col-span-2 space-y-6 animate-[slideUp_0.6s_ease-out]">
            <Card title="Live Emotion Detection" icon="📸">
              <CameraEmotionFeed onSupportMessage={setSupportMessage} />
            </Card>

            <Card title="Emotion Trend" icon="📊">
              <EmotionChartWrapper />
            </Card>
          </div>

          {/* Right Column - Assistant & Readings */}
          <div 
            className="space-y-6 animate-[slideUp_0.6s_ease-out]" 
            style={{ animationDelay: "0.1s" }}
          >
            <Card title="AI Assistant" icon="🤖">
              <AssistantClient externalSupportMessage={supportMessage} />
            </Card>

            <Card title="Recent Readings" icon="🩺">
              <div className="space-y-3">
                {latest.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No readings yet.</p>
                ) : (
                  latest.map((r, i) => (
                    <div 
                      key={r.id} 
                      className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:border-zinc-700 transition-all duration-300 hover:transform hover:scale-[1.02]"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="mb-2 text-xs text-zinc-500">
                        <FormattedDate timestamp={r.timestamp} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Metric label="Heart Rate" value={r.heartRate} unit="bpm" />
                        <Metric label="SpO₂" value={r.spO2} unit="%" />
                        <Metric label="Emotion" value={r.emotion} className="col-span-2" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}