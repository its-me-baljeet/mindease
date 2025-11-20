// components/FormattedDate.tsx
"use client";

type Props = {
  timestamp: string | Date;
};

export default function FormattedDate({ timestamp }: Props) {
  return (
    <span>
      {new Date(timestamp).toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })}
    </span>
  );
}
