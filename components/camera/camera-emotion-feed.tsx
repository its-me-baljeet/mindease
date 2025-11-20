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
  const lastSentRef = useRef<number>(0);

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState | null>(null);
  const [countdown, setCountdown] = useState(OBSERVATION_DURATION_MS / 1000);
  const [supportReady, setSupportReady] = useState(false);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);

  // Detect emotion once
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

    // Save to DB (rate-limited)
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

  // Start observation
  const start = useCallback(async () => {
    if (running) return;
    setLoading(true);
    observationsRef.current = [];
    startTimeRef.current = Date.now();
    lastSentRef.current = 0;
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

  // Stop observation
  const stop = useCallback(() => {
    setRunning(false);

    if (detectorRef.current !== null) clearInterval(detectorRef.current);
    detectorRef.current = null;

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
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
        stop();
        setSupportReady(true);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [running, stop]);

  // Cleanup
  useEffect(() => stop, [stop]);

  // Get AI support
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
      setSupportReady(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <p className="text-zinc-400 text-sm animate-pulse">Starting camera…</p>
      )}

      <div className="relative overflow-hidden rounded-xl border border-zinc-800/50 bg-black aspect-video">
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {!running && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
            <p className="text-zinc-400">Camera inactive</p>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!running ? (
          <button
            onClick={start}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-green-500/30"
          >
            Start Observation (30s)
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-red-500/30"
          >
            Stop
          </button>
        )}
      </div>

      {running && (
        <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <span className="text-yellow-400 text-sm font-medium">
            ⏱ Observing…
          </span>
          <span className="text-yellow-400 text-lg font-bold">{countdown}s</span>
        </div>
      )}

      {currentEmotion && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-300">
            🧠 <span className="font-semibold">{currentEmotion.label}</span>
            <span className="text-blue-400 ml-2">
              ({(currentEmotion.confidence * 100).toFixed(1)}%)
            </span>
          </p>
        </div>
      )}

      {supportReady && (
        <button
          onClick={getSupport}
          disabled={isLoadingSupport}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-blue-500/30"
        >
          {isLoadingSupport ? "🤔 Thinking…" : "✨ Get AI Support"}
        </button>
      )}
    </div>
  );
}