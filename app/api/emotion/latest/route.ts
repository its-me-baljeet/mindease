import prismaClient from "@/services/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: `${clerkId}@placeholder.local` },
  });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const rows = await prismaClient.dataPoint.findMany({
    where: { userId: user.id, emotion: { not: null } },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return NextResponse.json(rows.reverse());
}
