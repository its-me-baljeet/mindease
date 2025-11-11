import { NextResponse } from "next/server";
import crypto from "crypto";
import prismaClient from "@/services/prisma";

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

type Payload = {
  heartRate?: number; // bpm
  spO2?: number;      // %
  timestamp?: string | number; // optional, ISO or ms epoch
};

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-api-key");
    if (!key) return NextResponse.json({ error: "Missing X-API-Key" }, { status: 401 });

    const apiKeyHash = hashKey(key);
    const user = await prismaClient.user.findFirst({ where: { apiKeyHash } });
    if (!user) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const body = (await req.json()) as Payload;

    // Basic validation
    const heartRate =
      typeof body.heartRate === "number" && body.heartRate > 0 && body.heartRate < 250
        ? Math.round(body.heartRate)
        : undefined;

    const spO2 =
      typeof body.spO2 === "number" && body.spO2 > 50 && body.spO2 <= 100
        ? Number(body.spO2)
        : undefined;

    if (heartRate === undefined && spO2 === undefined) {
      return NextResponse.json({ error: "Provide at least one of heartRate or spO2" }, { status: 400 });
    }

    // Timestamp (server time default)
    let timestamp = new Date();
    if (typeof body.timestamp === "string" || typeof body.timestamp === "number") {
      const t = new Date(body.timestamp);
      if (!Number.isNaN(t.getTime())) timestamp = t;
    }

    const dp = await prismaClient.dataPoint.create({
      data: {
        userId: user.id,
        heartRate,
        spO2,
        timestamp,
      },
    });

    return NextResponse.json({ ok: true, id: dp.id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
