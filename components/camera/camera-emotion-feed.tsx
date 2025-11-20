// components/camera/camera-emotion-feed.tsx
"use client";

import * as faceapi from "@vladmandic/face-api";
import { useEffect, useRef, useState, useCallback } from "react";

type EmotionState = {
  label: string;
  confidence: number;
  expressions: Record<string, number>;
};

const DETECTION_INTERVAL_MS = 300;
const OBSERVATION_DURATION_MS = 30_000; // 30 sec
const SEND_INTERVAL_MS = 2000; // DB post rate-limit

type CameraEmotionFeedProps = {
  onSupportMessage?: (message: string) => void;
};

export default function CameraEmotionFeed({
  onSupportMessage,
}: CameraEmotionFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<number | null>(null);
  const observationsRef = useRef<EmotionState[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastSentRef = useRef<number>(0); // FIXED 🔥

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState | null>(null);
  const [countdown, setCountdown] = useState(OBSERVATION_DURATION_MS / 1000);
  const [supportReady, setSupportReady] = useState(false);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);

  // 🔍 Detect emotion once
  const detectEmotion = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!result?.expressions) return;

    const expressions = result.expressions as unknown as Record<string, number>;
    const [label, confidence] = Object.entries(expressions).reduce((a, b) =>
      b[1] > a[1] ? b : a
    );

    const emotion: EmotionState = { label, confidence, expressions };
    setCurrentEmotion(emotion);

    // Collect for 30s observation
    observationsRef.current.push(emotion);

    // 📡 Save to DB (rate-limited)
    if (Date.now() - lastSentRef.current >= SEND_INTERVAL_MS) {
      lastSentRef.current = Date.now();

      await fetch("/api/emotion/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Emotion-Key": process.env.NEXT_PUBLIC_EMOTION_API_KEY ?? "",
        },
        body: JSON.stringify({
          emotion: label,
          confidence,
          source: "camera",
          timestamp: Date.now(),
        }),
      }).catch((err) => console.error("Ingest error:", err));
    }
  }, []);

  // ▶ Start observation
  const start = useCallback(async () => {
    if (running) return;
    setLoading(true);
    observationsRef.current = [];
    startTimeRef.current = Date.now();
    lastSentRef.current = 0; // Reset send timer
    setSupportReady(false);
    setSupportMessage(null);

    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;
      video.onloadedmetadata = () => video.play().catch(console.error);

      detectorRef.current = window.setInterval(detectEmotion, DETECTION_INTERVAL_MS);
      setRunning(true);
    } catch (err) {
      console.error("Camera start failed:", err);
    } finally {
      setLoading(false);
    }
  }, [detectEmotion, running]);

  // ⏹ Stop observation
  const stop = useCallback(() => {
    setRunning(false);

    if (detectorRef.current !== null) clearInterval(detectorRef.current);
    detectorRef.current = null;

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setCountdown(OBSERVATION_DURATION_MS / 1000);
    setCurrentEmotion(null);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!running) return;
    const timerId = window.setInterval(() => {
      const remaining = Math.max(
        0,
        OBSERVATION_DURATION_MS - (Date.now() - startTimeRef.current)
      );
      setCountdown(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(timerId);
        setRunning(false);
        setSupportReady(true);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [running]);

  // Cleanup
  useEffect(() => stop, [stop]);

  // 🌐 Get AI support
  const getSupport = async () => {
    if (!supportReady) return;
    setIsLoadingSupport(true);

    try {
      const res = await fetch("/api/get-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations: observationsRef.current }),
      });

      const data = await res.json();
      if (data.supportMessage) {
        setSupportMessage(data.supportMessage);
        onSupportMessage?.(data.supportMessage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSupport(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {loading && <p className="text-zinc-400">Starting camera…</p>}

      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        width={400}
        height={300}
        className="rounded-lg border border-zinc-700 shadow-lg bg-black"
      />

      {/* 🎛 Control Buttons */}
      <div className="flex gap-2">
        {!running ? (
          <button onClick={start} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl text-white text-sm">
            Start Observation (30s)
          </button>
        ) : (
          <button onClick={stop} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-white text-sm">
            Stop
          </button>
        )}
      </div>

      {running && <p className="text-yellow-400 text-sm">⏱ Observing… <strong>{countdown}s</strong></p>}

      {currentEmotion && (
        <p className="text-sm text-zinc-200">
          🧠 {currentEmotion.label} <span className="text-zinc-400">({(currentEmotion.confidence * 100).toFixed(1)}%)</span>
        </p>
      )}

      {supportReady && (
        <button onClick={getSupport} disabled={isLoadingSupport} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 px-4 py-2 rounded-xl text-white text-sm">
          {isLoadingSupport ? "🤔 Thinking…" : "✨ Get AI Support"}
        </button>
      )}

      {supportMessage && (
        <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm whitespace-pre-line text-zinc-100">
          <p className="font-semibold mb-1">AI Support</p>
          {supportMessage}
        </div>
      )}
    </div>
  );
}
