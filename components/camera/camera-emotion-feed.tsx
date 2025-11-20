"use client";

import * as faceapi from "@vladmandic/face-api";
import { useEffect, useRef, useState, useCallback } from "react";

type EmotionState = {
  label: string;
  confidence: number;
  expressions: Record<string, number>;
};

const DETECTION_INTERVAL_MS = 300;
const OBSERVATION_DURATION_MS = 30000; // 30 sec

export default function CameraEmotionFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<number | null>(null);
  const observations = useRef<EmotionState[]>([]);
  const startTime = useRef<number>(0);

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

    observations.current.push(emotion);
  }, []);

  // Start observation
  const start = useCallback(async () => {
    if (running) return;
    setLoading(true);
    setSupportMessage(null);
    observations.current = [];
    startTime.current = Date.now();
    setSupportReady(false);

    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }

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

    if (detectorRef.current) {
      clearInterval(detectorRef.current);
      detectorRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }

    setCurrentEmotion(null);
    setCountdown(OBSERVATION_DURATION_MS / 1000);
  }, []);

  useEffect(() => stop, [stop]);

  // Countdown Timer
  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, OBSERVATION_DURATION_MS - elapsed);
      setCountdown(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(timer);
        setRunning(false);
        setSupportReady(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  // Fetch support message
  const getSupport = async () => {
    setIsLoadingSupport(true);
    try {
      const res = await fetch("/api/get-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations: observations.current }),
      });

      const data = await res.json();
      if (data.supportMessage) {
        setSupportMessage(data.supportMessage); // Show in UI
      }
    } catch (err) {
      console.error("Support fetch error:", err);
      setSupportMessage("⚠️ Unable to fetch emotional support at this moment.");
    } finally {
      setIsLoadingSupport(false);
    }
  };

  return (
    <div>
      {loading && <p>Starting camera...</p>}
      <video ref={videoRef} muted autoPlay width={400} height={300} />

      <div className="mt-2 flex gap-2">
        {!running ? (
          <button onClick={start} className="bg-green-500 px-4 py-2 rounded text-white">
            Start Observation
          </button>
        ) : (
          <button onClick={stop} className="bg-red-500 px-4 py-2 rounded text-white">
            Stop
          </button>
        )}
      </div>

      {running && <p>⏱ Observing… {countdown}s left</p>}

      {currentEmotion && (
        <p>
          🧠 {currentEmotion.label} ({(currentEmotion.confidence * 100).toFixed(1)}%)
        </p>
      )}

      {supportReady && (
        <button
          onClick={getSupport}
          disabled={isLoadingSupport}
          className="bg-blue-500 px-4 py-2 rounded text-white mt-2"
        >
          {isLoadingSupport ? "Analyzing..." : "Get Support"}
        </button>
      )}

      {supportMessage && (
        <div className="mt-3 p-3 bg-zinc-800 border border-zinc-600 rounded-lg text-sm">
          <p className="text-zinc-200 whitespace-pre-line">{supportMessage}</p>
        </div>
      )}
    </div>
  );
}
