import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import prismaClient from "@/services/prisma";

function makeKey() {
  // 32 bytes random => base64url
  return crypto.randomBytes(32).toString("base64url");
}
function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure local user exists
  const user = await prismaClient.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: `${clerkId}@placeholder.local` },
  });

  const apiKey = makeKey();
  const apiKeyHash = hashKey(apiKey);

  // Rotate (overwrite) existing hash if present
  await prismaClient.user.update({
    where: { id: user.id },
    data: { apiKeyHash },
  });

  // Return plaintext ONCE; you won't see it again
  return NextResponse.json({ apiKey }, { status: 201 });
}
