import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import prisma from "@/services/prisma";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    const { observations, userId } = await req.json();
    if (!Array.isArray(observations) || observations.length === 0) {
      return NextResponse.json({ error: "No observations provided" }, { status: 400 });
    }

    // 🧠 Step 1 – Aggregate emotional findings
    const emotionCount: Record<string, number> = {};
    let totalConfidence = 0;

    observations.forEach((o: any) => {
      emotionCount[o.label] = (emotionCount[o.label] || 0) + 1;
      totalConfidence += o.confidence;
    });

    const dominantEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0][0];
    const avgConfidence = totalConfidence / observations.length;

    // ⛑️ Step 2 – Get health data (if userId exists)
    let healthInfo = "";
    if (userId) {
      const latest = await prisma.dataPoint.findFirst({
        where: { userId },
        orderBy: { timestamp: "desc" },
      });
      if (latest) {
        healthInfo = `Heart Rate: ${latest.heartRate ?? "N/A"} bpm, SpO₂: ${latest.spO2 ?? "N/A"}%.`;
      }
    }

    // 🤖 Step 3 – Call Gemini API (updated)
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
We observed your emotional pattern over 30 seconds.

🟡 Dominant emotion: ${dominantEmotion} (${(avgConfidence * 100).toFixed(1)}% confidence)
${healthInfo ? "💓 Physiological State: " + healthInfo : ""}

Act as an empathetic mental health support assistant and respond with:
1. A short, comforting reflection based on this emotional state.
2. A practical micro-strategy (e.g., breathing, reframing, grounding).
3. A short reflective question.
⚠️ Max 6 sentences. Avoid generic advice. Speak warmly and personally.
`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // performance-optimized
      },
    });

    const supportMessage = response.text || "No response generated";

    return NextResponse.json({
      ok: true,
      dominantEmotion,
      avgConfidence,
      supportMessage,
    });
  } catch (err: any) {
    console.error("🔥 Support API Error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
