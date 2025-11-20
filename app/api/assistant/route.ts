import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const prompt = `
You are **MindEase**, an emotionally intelligent AI support assistant.

🧠 Communication Style:
- Speak like a caring human, NOT like an AI.
- Be empathetic, warm, and supportive.
- First: acknowledge the user’s feelings with emotional validation.
- Then: offer personal insight or encouragement.
- Finally: suggest one small, actionable step.
- Keep it short (5–6 sentences), natural, and conversational.
- Use paragraphs and spacing so it feels easy to read.
- Avoid lists, headings, or teaching tone. Speak like you're gently talking to them.

User said: "${message}"

Now respond as MindEase:
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const reply =
      response.text ||
      "I'm here for you. Sometimes words don't come easy, but I’m listening.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("AI Assistant API Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Error generating support response" },
      { status: 500 }
    );
  }
}
