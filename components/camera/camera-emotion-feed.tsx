"use client";

import * as faceapi from "@vladmandic/face-api";
import { useEffect, useRef, useState, useCallback } from "react";

type EmotionState = { label: string; confidence: number; expressions: Record<string, number> };

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

  // Detect emotion once
  const detectEmotion = useCallback(async () => {
    if (!videoRef.current) return;
    const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
    if (!result?.expressions) return;

    const expressions = result.expressions as unknown as Record<string, number>;
    const [label, confidence] = Object.entries(expressions).reduce((a, b) => (b[1] > a[1] ? b : a));
    const emotion = { label, confidence, expressions };
    setCurrentEmotion(emotion);

    observations.current.push(emotion);
  }, []);

  // Start observation
  const start = useCallback(async () => {
    if (running) return;
    setLoading(true);
    observations.current = [];
    startTime.current = Date.now();
    setSupportReady(false);

    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current!.srcObject = stream;
      videoRef.current!.onloadedmetadata = () => videoRef.current!.play();

      detectorRef.current = window.setInterval(detectEmotion, DETECTION_INTERVAL_MS);

      setRunning(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [detectEmotion, running]);

  // Stop observation
  const stop = useCallback(() => {
    setRunning(false);

    if (detectorRef.current) clearInterval(detectorRef.current);
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

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, OBSERVATION_DURATION_MS - (Date.now() - startTime.current));
      setCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        window.clearInterval(timer);
        setRunning(false);
        setSupportReady(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => stop, [stop]);

  // Get support
  const getSupport = async () => {
    const res = await fetch("/api/get-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observations: observations.current }),
    });
    const data = await res.json();
    if (data.supportMessage) alert("💬 " + data.supportMessage);
  };

  return (
    <div>
      {loading && <p>Starting...</p>}
      <video ref={videoRef} muted autoPlay width={400} height={300} />

      <div className="mt-2">
        {!running ? (
          <button onClick={start} className="bg-green-500 px-4 py-2 text-white">Start Observation</button>
        ) : (
          <button onClick={stop} className="bg-red-500 px-4 py-2 text-white">Stop</button>
        )}
      </div>

      {running && <p>⏱ Observing… {countdown}s left</p>}
      {supportReady && <button onClick={getSupport} className="bg-blue-500 px-4 py-2 text-white">Get Support</button>}
      {currentEmotion && <p>🧠 {currentEmotion.label} ({(currentEmotion.confidence * 100).toFixed(1)}%)</p>}
    </div>
  );
}
