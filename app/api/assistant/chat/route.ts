import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/services/prisma";
import { auth } from "@clerk/nextjs/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

const inputSchema = z.object({
  inputText: z.string().min(1, "Input text required"),
  emotion: z.string().optional(),
  heartRate: z.number().optional(),
  spO2: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );

    const { inputText, emotion, heartRate, spO2 } = parsed.data;

    // Upsert user
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: { clerkId, email: `${clerkId}@placeholder.local` },
    });

    // Create chat session
    const session = await prisma.chatSession.create({
      data: { userId: user.id },
    });

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: `Emotion: ${emotion ?? "Unknown"} | HR: ${heartRate ?? "N/A"} | SpO₂: ${spO2 ?? "N/A"}\n${inputText}`,
      },
    });

    // Build Gemini prompt
    const prompt = `
You are MindEase — an empathetic AI assistant providing emotional support.
Analyze this user's emotional and physiological data and reply kindly.

Emotion: ${emotion ?? "Unknown"}
Heart Rate: ${heartRate ?? "N/A"}
SpO₂: ${spO2 ?? "N/A"}

User Message:
${inputText}

Give a short (2–4 sentences) supportive response.
If vitals are extreme (HR > 140 or SpO₂ < 85), include a brief safety suggestion.
Avoid medical diagnosis.
`;

    // Call Gemini API via REST
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error: ${text}`);
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I couldn’t generate a response.";

    // Save assistant message
    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "BOT", content: reply },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      reply,
    });
  } catch (err: any) {
    console.error("Gemini Assistant Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
