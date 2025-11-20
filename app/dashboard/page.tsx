// app/dashboard/page.tsx
import prisma from "@/services/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: `${clerkId}@placeholder.local` },
  });

  const latest = await prisma.dataPoint.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  const latestForClient = latest.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    heartRate: r.heartRate ?? null,
    spO2: r.spO2 ?? null,
    emotion: r.emotion ?? null,
  }));

  return <DashboardClient latest={latestForClient} />;
}
