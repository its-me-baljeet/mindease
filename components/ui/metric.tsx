// components/ui/metric.tsx
interface MetricProps {
  label: string;
  value: string | number | null;
  unit?: string;
  className?: string;
}

export default function Metric({ label, value, unit, className = "" }: MetricProps) {
  return (
    <div className={className}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">
        {value ?? "-"}{" "}
        {unit && value && (
          <span className="text-sm text-zinc-400">{unit}</span>
        )}
      </p>
    </div>
  );
}