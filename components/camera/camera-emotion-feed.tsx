"use client";

import { TextEncoder as NodeTextEncoder } from "util";
import { useEffect, useRef, useState, useCallback } from "react";

type EmotionState = {
  label: string;
  confidence: number;
  expressions: Record<string, number>;
};

const EMOTION_API_KEY = process.env.NEXT_PUBLIC_EMOTION_API_KEY || "";
const SEND_INTERVAL_MS = 2000;
const DETECTION_INTERVAL_MS = 300;
const SMOOTHING_WINDOW = 5;

export default function CameraEmotionFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState | null>(null);
  const lastSentRef = useRef<number>(0);
  const intervalIdRef = useRef<number | null>(null);
  const emotionHistory = useRef<EmotionState[]>([]);

  /** 🔹 Send emotion to backend */
  const sendToBackend = useCallback((emotion: string, confidence: number) => {
    if (!EMOTION_API_KEY) {
      console.warn("NEXT_PUBLIC_EMOTION_API_KEY missing.");
      return;
    }

    const now = Date.now();
    if (now - lastSentRef.current < SEND_INTERVAL_MS) return;
    lastSentRef.current = now;

    fetch("/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emotion-Key": EMOTION_API_KEY,
      },
      body: JSON.stringify({ emotion, confidence, source: "camera", timestamp: now }),
    }).catch(console.error);
  }, []);

  /** 🔹 Detect emotions (dynamically import face-api here) */
  const detectEmotionOnce = useCallback(async () => {
    if (!videoRef.current) return;

    // Dynamically load faceapi only on client
    const faceapi = await import("@vladmandic/face-api");

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!detections?.expressions) return;

    // Proper TS casting
    const expressions = detections.expressions as unknown as Record<string, number>;
    const [label, confidence] = Object.entries(expressions).reduce((a, b) =>
      b[1] > a[1] ? b : a
    );

    const newEmotion: EmotionState = { label, confidence, expressions };
    setCurrentEmotion(newEmotion);

    // Smoothing logic
    emotionHistory.current = [
      ...emotionHistory.current.slice(-SMOOTHING_WINDOW + 1),
      newEmotion,
    ];

    const avgExpressions: Record<string, number> = {};
    for (const item of emotionHistory.current) {
      for (const [k, v] of Object.entries(item.expressions)) {
        avgExpressions[k] = (avgExpressions[k] || 0) + v;
      }
    }
    for (const k in avgExpressions) {
      avgExpressions[k] /= emotionHistory.current.length;
    }

    const [smoothLabel, smoothConf] = Object.entries(avgExpressions).reduce((a, b) =>
      b[1] > a[1] ? b : a
    );

    sendToBackend(smoothLabel, smoothConf);
  }, [sendToBackend]);

  /** 🔹 Start camera */
  const startCamera = useCallback(async () => {
    if (isRunning) return;
    setLoading(true);

    try {
      // Polyfill TextEncoder if needed
if (typeof window !== "undefined" && !("TextEncoder" in window)) {
  (window as unknown as { TextEncoder: typeof NodeTextEncoder }).TextEncoder = NodeTextEncoder;
}

      const faceapi = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => videoRef.current?.play();

      intervalIdRef.current = window.setInterval(detectEmotionOnce, DETECTION_INTERVAL_MS);
      setIsRunning(true);
    } catch (err) {
      console.error("Camera start failed:", err);
    }

    setLoading(false);
  }, [detectEmotionOnce, isRunning]);

  /** 🔹 Stop camera */
  const stopCamera = useCallback(() => {
    setIsRunning(false);

    if (intervalIdRef.current) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setCurrentEmotion(null);
  }, []);

  /** 🔹 Cleanup */
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="flex flex-col items-start gap-2">
        {loading && <p className="text-gray-500">Loading camera & models...</p>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width={400}
          height={300}
          className="rounded-lg shadow-lg border border-zinc-700"
        />

        <div className="flex gap-2">
          {!isRunning ? (
            <button onClick={startCamera} className="px-4 py-2 bg-green-600 rounded-xl text-white">
              Start Camera
            </button>
          ) : (
            <button onClick={stopCamera} className="px-4 py-2 bg-red-600 rounded-xl text-white">
              Stop Camera
            </button>
          )}
        </div>
      </div>

      <div className="min-w-60 rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm">
        <h2 className="text-lg font-semibold mb-2">Live Emotion</h2>
        {!currentEmotion ? (
          <p className="text-zinc-400">Face not detected yet…</p>
        ) : (
          <>
            <p className="text-base mb-2">
              <strong className="text-blue-400">Dominant:</strong> {currentEmotion.label}{" "}
              <span className="text-zinc-400">
                ({(currentEmotion.confidence * 100).toFixed(1)}%)
              </span>
            </p>

            <div className="space-y-1">
              {Object.entries(currentEmotion.expressions).map(([name, value]) => (
                <div key={name} className="flex justify-between capitalize text-zinc-300">
                  <span>{name}</span>
                  <span className="text-zinc-400">{(value * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
