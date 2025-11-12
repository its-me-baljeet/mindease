import { NextResponse } from "next/server";
import crypto from "crypto";
import { broadcast } from "@/lib/realtime"; // ✅ Optional: if you have real-time dashboard updates
import { Emotion } from "@prisma/client";
import prismaClient from "@/services/prisma";

// 👇 Allow dynamic rendering so IoT requests aren't blocked by Clerk middleware
export const dynamic = "force-dynamic";

/** Hash API keys using SHA-256 */
function hashKeyRaw(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Safely map string -> Emotion enum */
function normalizeEmotion(value: any): Emotion | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  return Object.values(Emotion).includes(upper as Emotion) ? (upper as Emotion) : null;
}

export async function POST(req: Request) {
  try {
    // -------------------------
    // 1️⃣ Validate API Key
    // -------------------------
    const headerKey =
      req.headers.get("x-emotion-key") ?? req.headers.get("X-Emotion-Key") ?? "";
    if (!headerKey)
      return NextResponse.json({ error: "Missing X-Emotion-Key" }, { status: 401 });

    const hashed = hashKeyRaw(headerKey);

    // Find the user whose stored hash matches
    const user = await prismaClient.user.findFirst({
      where: {
        OR: [
          { apiKeyHash: hashed },
          { emotionKeyHash: hashed },
        ],
      },
    });

    if (!user)
      return NextResponse.json({ error: "Invalid X-Emotion-Key" }, { status: 401 });

    // -------------------------
    // 2️⃣ Parse and normalize body
    // -------------------------
    const body = await req.json().catch(() => ({}));
    const { heartRate, spO2, emotion, confidence, timestamp } = body ?? {};

    const hr =
      typeof heartRate === "number" && !isNaN(heartRate)
        ? Math.round(heartRate)
        : null;
    const sp =
      typeof spO2 === "number" && !isNaN(spO2) ? Number(spO2) : null;
    const em = normalizeEmotion(emotion);
    const ts = timestamp ? new Date(Number(timestamp)) : new Date();

    // -------------------------
    // 3️⃣ Save to Prisma
    // -------------------------
    const dataPoint = await prismaClient.dataPoint.create({
      data: {
        userId: user.id,
        heartRate: hr,
        spO2: sp,
        emotion: em,
        timestamp: ts,
      },
    });

    // -------------------------
    // 4️⃣ Broadcast via WebSocket (optional)
    // -------------------------
    try {
      broadcast({
        type: "emotion",
        userClerkId: user.clerkId,
        row: {
          id: dataPoint.id,
          timestamp: dataPoint.timestamp,
          heartRate: dataPoint.heartRate,
          spO2: dataPoint.spO2,
          emotion: dataPoint.emotion,
        },
      });
    } catch (err) {
      console.warn("Broadcast skipped:", err);
    }

    // -------------------------
    // 5️⃣ Respond
    // -------------------------
    return NextResponse.json(
      { ok: true, id: dataPoint.id },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Ingest route error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/** Optional quick test for GET */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/emotion/ingest",
    message: "Use POST with JSON body and X-Emotion-Key header",
  });
}
