// app/dashboard/page.tsx

import CameraEmotionFeed from "@/components/camera/camera-emotion-feed";
import AssistantClient from "@/components/assistant/assistant-client";
import EmotionChartWrapper from "@/components/charts/emotion-chart-wrapper";
import prismaClient from "@/services/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: `${clerkId}@placeholder.local`,
    },
  });

  const latest = await prismaClient.dataPoint.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* 📸 Emotion Monitor */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Emotion Monitoring</h2>
        <CameraEmotionFeed />
      </section>

      {/* 📈 Emotion Trends */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Emotion Trend</h2>
        <EmotionChartWrapper />
      </section>

      {/* 🤖 AI Assistant */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">AI Emotional Support Assistant</h2>
        <AssistantClient />
      </section>

      {/* 🩺 Latest IoT + Emotion Readings */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Latest Readings</h2>
        {latest.length === 0 ? (
          <p className="text-zinc-500">No readings yet.</p>
        ) : (
          latest.map((r) => (
            <div key={r.id} className="border-b py-2 text-sm">
              <p><strong>Time:</strong> {new Date(r.timestamp).toLocaleString()}</p>
              <p><strong>Heart Rate:</strong> {r.heartRate ?? "-"}</p>
              <p><strong>SpO₂:</strong> {r.spO2 ?? "-"}</p>
              <p><strong>Emotion:</strong> {r.emotion ?? "-"}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
