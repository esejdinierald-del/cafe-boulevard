import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { securityScore } from "@/data/vuln-scan";

export function ScoreGauge() {
  const { pct, grade } = securityScore();
  const color = pct >= 90 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";
  const data = [{ name: "score", value: pct, fill: color }];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h3 className="mb-1 text-sm font-medium uppercase tracking-widest text-slate-400">Security Score</h3>
      <p className="mb-2 text-xs text-slate-500">Share of packages with zero known vulnerabilities</p>
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={20} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-semibold text-white tabular-nums">{pct}%</span>
          <span
            className="mt-1 rounded-full border px-3 py-0.5 text-xs font-medium uppercase tracking-widest"
            style={{ color, borderColor: `${color}55`, background: `${color}22` }}
          >
            Grade {grade}
          </span>
        </div>
      </div>
    </div>
  );
}