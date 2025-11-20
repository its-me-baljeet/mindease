// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import prisma from "@/services/prisma";
import { createHash } from "crypto";
import { Emotion } from "@prisma/client";

export const runtime = "nodejs";

const MERGE_WINDOW_MS = Number(process.env.MERGE_WINDOW_MS ?? 10000); // 10s window

// Normalize emotion strings to Prisma enum
function normalizeEmotion(e?: string): Emotion | undefined {
  if (!e) return undefined;
  const s = e.toString().trim().toUpperCase();
  switch (s) {
    case "HAPPY":
      return "HAPPY";
    case "NEUTRAL":
      return "NEUTRAL";
    case "SAD":
      return "SAD";
    case "ANGRY":
      return "ANGRY";
    case "STRESSED":
    case "STRESS":
    case "FEAR":
    case "DISGUST":
    case "SURPRISE":
      return "STRESSED";
    default:
      return undefined;
  }
}

export async function POST(req: Request) {
  try {
    // ✅ Public route now — handle IoT and camera posts securely with API key
    const apiKey = req.headers.get("x-api-key") ?? req.headers.get("x-emotion-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    // Find the user by hashed API key (either emotionKeyHash or apiKeyHash)
    const hashed = createHash("sha256").update(apiKey).digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ apiKeyHash: hashed }, { emotionKeyHash: hashed }],
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const {
      deviceId,
      correlationId,
      timestamp,
      heartRate,
      spO2,
      emotion,
      confidence,
      source,
    } = body ?? {};

    const ts = timestamp ? new Date(Number(timestamp)) : new Date();
    const emotionEnum = normalizeEmotion(emotion);

    // --- Find an existing datapoint to merge ---
    let existing = null;

    // 1️⃣ Try correlationId match first
    if (correlationId) {
      existing = await prisma.dataPoint.findFirst({
        where: { userId: user.id, correlationId },
      });
    }

    // 2️⃣ Else, find a record from a different source within ±10s
    if (!existing) {
      existing = await prisma.dataPoint.findFirst({
        where: {
          userId: user.id,
          timestamp: {
            gte: new Date(ts.getTime() - MERGE_WINDOW_MS),
            lte: new Date(ts.getTime() + MERGE_WINDOW_MS),
          },
          NOT: [{ source: source ?? "" }],
        },
        orderBy: { timestamp: "desc" },
      });
    }

    let row;

    if (existing) {
      // --- Merge values into existing row ---
      const updateData: Record<string, any> = {
        timestamp: ts > existing.timestamp ? ts : existing.timestamp,
        deviceId: deviceId ?? existing.deviceId,
        correlationId: correlationId ?? existing.correlationId,
        source: [existing.source, source].filter(Boolean).join(",") ?? existing.source,
      };

      if (typeof heartRate === "number") updateData.heartRate = Math.round(heartRate);
      if (typeof spO2 === "number") updateData.spO2 = Number(spO2);
      if (emotionEnum) updateData.emotion = emotionEnum;
      if (typeof confidence === "number") updateData.confidence = Number(confidence);

      row = await prisma.dataPoint.update({
        where: { id: existing.id },
        data: updateData,
      });

      console.log(
        `[MERGED] DataPoint ${existing.id} updated → ${Object.keys(updateData).join(", ")}`
      );
    } else {
      // --- Create new datapoint ---
      row = await prisma.dataPoint.create({
        data: {
          userId: user.id,
          timestamp: ts,
          deviceId,
          correlationId,
          source: source ?? (heartRate || spO2 ? "iot" : "camera"),
          heartRate: typeof heartRate === "number" ? Math.round(heartRate) : undefined,
          spO2: typeof spO2 === "number" ? Number(spO2) : undefined,
          emotion: emotionEnum ?? undefined,
          confidence: typeof confidence === "number" ? Number(confidence) : undefined,
        },
      });

      console.log(`[NEW] Created DataPoint ${row.id} (${source ?? "unknown"})`);
    }

    // Return success
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (err: any) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
