import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { romeClockFull } from "@/lib/rome-time";

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * Read-only clock/date in Europe/Rome timezone (== Tirana).
 * Ticks every second; not affected by the device's local clock display.
 */
export const RomeClock = ({ className = "", compact = false }: Props) => {
  const [now, setNow] = useState<string>(() => romeClockFull());
  useEffect(() => {
    const id = setInterval(() => setNow(romeClockFull()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className={
        `inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-slate-900/60 px-2 py-1 font-mono ` +
        (compact ? "text-[11px] " : "text-xs ") +
        `text-amber-200 tabular-nums select-none pointer-events-none ` +
        className
      }
      aria-label="Ora zyrtare (Europe/Rome)"
      title="Ora zyrtare (Europe/Rome) — nuk modifikohet"
    >
      <Clock className="h-3 w-3 opacity-70" />
      <span>{now}</span>
    </div>
  );
};