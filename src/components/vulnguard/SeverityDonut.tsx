import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { totals } from "@/data/vuln-scan";

export function SeverityDonut() {
  const t = totals();
  const data = [
    { name: "High", value: t.high, color: "#ef4444" },
    { name: "Moderate", value: t.moderate, color: "#f59e0b" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h3 className="mb-1 text-sm font-medium uppercase tracking-widest text-slate-400">Severity Breakdown</h3>
      <p className="mb-4 text-xs text-slate-500">Distribution across all vulnerabilities</p>
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={68} outerRadius={98} paddingAngle={3} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#e2e8f0",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold text-white tabular-nums">{t.totalVulns}</span>
          <span className="text-xs uppercase tracking-widest text-slate-400">Total</span>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-slate-300">High <span className="text-slate-500">({t.high})</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-300">Moderate <span className="text-slate-500">({t.moderate})</span></span>
        </div>
      </div>
    </div>
  );
}