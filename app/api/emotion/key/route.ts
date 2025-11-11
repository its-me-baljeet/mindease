import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import prismaClient from "@/services/prisma";

function makeKey() {
  return crypto.randomBytes(32).toString("base64url");
}
function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: `${clerkId}@placeholder.local` },
  });

  const plainKey = makeKey();
  const keyHash = hashKey(plainKey);

  await prismaClient.user.update({
    where: { id: user.id },
    data: { emotionKeyHash: keyHash },
  });

  return NextResponse.json({ apiKey: plainKey }, { status: 201 });
}
