import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Emotion } from "@prisma/client";
import prismaClient from "@/services/prisma";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const heartRate = form.get("heartRate") ? Number(form.get("heartRate")) : null;
  const spO2 = form.get("spO2") ? Number(form.get("spO2")) : null;
  const emotionInput = form.get("emotion")?.toString().toUpperCase() as Emotion | undefined;

  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: `${clerkId}@placeholder.local` },
  });

  const dataPoint = await prismaClient.dataPoint.create({
    data: {
      userId: user.id,
      heartRate: heartRate ?? undefined,
      spO2: spO2 ?? undefined,
      emotion: emotionInput ?? undefined,
    },
  });

  return NextResponse.redirect("/dashboard");
}
