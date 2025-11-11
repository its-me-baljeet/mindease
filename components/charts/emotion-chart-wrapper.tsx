"use client";

import dynamic from "next/dynamic";

const EmotionChart = dynamic(
  () => import("@/components/charts/emotion-chart"),
  { ssr: false }
);

export default function EmotionChartWrapper() {
  return <EmotionChart />;
}
