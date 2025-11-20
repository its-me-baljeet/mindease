
import AssistantClient from "@/components/assistant/assistant-client";
import CameraEmotionFeed from "@/components/camera/camera-emotion-feed";
import EmotionChartWrapper from "@/components/charts/emotion-chart-wrapper";
import prismaClient from "@/services/prisma";
import prisma from "@/services/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: `${clerkId}@placeholder.local` },
  });

  const latest = await prisma.dataPoint.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* 🔥 Integrated Camera Emotion Feed */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Live Emotion Detection</h2>
        <CameraEmotionFeed />
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Recent Readings</h2>
        
        {latest.length === 0 && <p className="text-zinc-500">No readings yet.</p>}

        {latest.map((r) => (
          <div key={r.id} className="border-b py-2">
            <p><strong>Time:</strong> {new Date(r.timestamp).toLocaleString()}</p>
            <p><strong>Heart Rate:</strong> {r.heartRate ?? "-"}</p>
            <p><strong>SpO₂:</strong> {r.spO2 ?? "-"}</p>
            <p><strong>Emotion:</strong> {r.emotion ?? "-"}</p>
          </div>
        ))}
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-4">Real-time Emotion Trend</h2>
        <EmotionChartWrapper />
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Assistant</h2>
        <AssistantClient />
      </section>
    </main>
  );
}
