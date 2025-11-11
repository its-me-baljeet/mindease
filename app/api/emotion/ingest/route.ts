import { NextResponse } from "next/server";
import crypto from "crypto";
import { Emotion } from "@prisma/client";
import prismaClient from "@/services/prisma";
import { broadcast } from "@/lib/realtime";

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

const EMOTION_MAP: Record<string, Emotion> = {
  happy: "HAPPY",
  neutral: "NEUTRAL",
  sad: "SAD",
  angry: "ANGRY",
  // Map other DeepFace labels to nearest category
  fear: "STRESSED",
  disgust: "STRESSED",
  surprise: "STRESSED",
  stress: "STRESSED",
  stressed: "STRESSED",
};

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-emotion-key");
    if (!key)
      return NextResponse.json(
        { error: "Missing X-Emotion-Key" },
        { status: 401 }
      );

    const hashed = hashKey(key);
    const user = await prismaClient.user.findFirst({
      where: { emotionKeyHash: hashed },
    });
    if (!user)
      return NextResponse.json({ error: "Invalid key" }, { status: 401 });

    const body = await req.json();
    const { emotion, confidence, timestamp } = body ?? {};

    if (typeof emotion !== "string" || !emotion) {
      return NextResponse.json({ error: "emotion required" }, { status: 400 });
    }

    const normalized = EMOTION_MAP[emotion.toLowerCase()] ?? "STRESSED";
    let ts = new Date();
    if (typeof timestamp === "number") ts = new Date(timestamp * 1000);
    if (typeof timestamp === "string") {
      const maybe = new Date(timestamp);
      if (!isNaN(maybe.getTime())) ts = maybe;
    }

    const SCORE: Record<string, number> = {
      HAPPY: 20,
      NEUTRAL: 40,
      SAD: 65,
      ANGRY: 75,
      STRESSED: 85,
    };
    const stressScore = SCORE[normalized] ?? 50;

    const row = await prismaClient.dataPoint.create({
      data: {
        userId: user.id,
        emotion: normalized,
        timestamp: ts,
        stressScore,
      },
    });

    broadcast({
      type: "emotion",
      userId: user.clerkId,
      row: {
        id: row.id,
        timestamp: row.timestamp,
        emotion: row.emotion,
        stressScore: row.stressScore ?? null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
