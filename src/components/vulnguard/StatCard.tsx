import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "neutral" | "danger" | "warning" | "success";
  hint?: string;
}

const toneMap = {
  neutral: "text-slate-200 border-white/10",
  danger: "text-red-300 border-red-500/30",
  warning: "text-amber-200 border-amber-500/30",
  success: "text-emerald-300 border-emerald-500/30",
} as const;

const iconTone = {
  neutral: "bg-white/5 text-slate-200",
  danger: "bg-red-500/15 text-red-300",
  warning: "bg-amber-500/15 text-amber-300",
  success: "bg-emerald-500/15 text-emerald-300",
} as const;

export function StatCard({ label, value, icon: Icon, tone = "neutral", hint }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white/5 p-5 backdrop-blur-xl transition hover:bg-white/[0.07] hover:-translate-y-0.5 ${toneMap[tone]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 font-display text-4xl font-semibold text-white tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${iconTone[tone]}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}