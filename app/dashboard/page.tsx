import AssistantClient from "@/components/assistant/assistant-client";
import EmotionChartWrapper from "@/components/charts/emotion-chart-wrapper";
import prismaClient from "@/services/prisma";
import prisma from "@/services/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  // Create/find the User record in DB
  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: `${clerkId}@placeholder.local`,
    },
  });

  // after you have 'user'
  const latest = await prisma.dataPoint.findMany({
    where: { userId: user.id, emotion: { not: null } },
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-2">Recent IoT Readings</h2>

        {latest.length === 0 && (
          <p className="text-zinc-500">No readings yet.</p>
        )}

        {latest.map((r) => (
          <div key={r.id} className="border-b py-2">
            <p>
              <strong>Time:</strong> {new Date(r.timestamp).toLocaleString()}
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
        ))}
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold text-xl mb-4">Simulate New Reading</h2>

        <section className="border rounded-xl p-4">
          <h2 className="font-semibold text-xl mb-2">
            Real-time Emotion Trend
          </h2>
          <EmotionChartWrapper />
        </section>

        {/* <form action="/api/simulate" method="post" className="space-y-3">
          <input
            name="heartRate"
            placeholder="Heart Rate"
            className="border p-2 rounded w-full bg-transparent"
          />
          <input
            name="spO2"
            placeholder="SpO₂"
            className="border p-2 rounded w-full bg-transparent"
          />
          <input
            name="emotion"
            placeholder="Emotion (HAPPY, SAD, etc.)"
            className="border p-2 rounded w-full bg-transparent"
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-xl"
            type="submit"
          >
            Add Reading
          </button>
        </form> */}
        <AssistantClient />
      </section>
    </main>
  );
}
