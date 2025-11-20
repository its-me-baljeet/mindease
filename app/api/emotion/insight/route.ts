import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { emotionData, heartRate, spO2 } = await req.json();

    if (!emotionData || !Array.isArray(emotionData)) {
      return NextResponse.json(
        { error: "Missing or invalid emotionData" },
        { status: 400 }
      );
    }

    // Prepare prompt
    const prompt = `
You are an expert emotional support AI.

The user’s recent emotional observations (last 30-60 sec) are:
${JSON.stringify(emotionData, null, 2)}

Vitals:
- 🫀 Heart Rate: ${heartRate ?? "unknown"}
- 🩸 SpO₂: ${spO2 ?? "unknown"}

🧠 Based on this:
1. Identify the likely emotional state.
2. Describe the emotional trend (improving, declining, stressed, etc.).
3. Suggest psychological support strategies (brief, actionable).
4. If needed, recommend breathing exercises or chat support.

Response format:
{
  "summary": "...short summary...",
  "currentEmotion": "...",
  "suggestion": "...something supportive...",
  "urgent": boolean
}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Gemini insight error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
