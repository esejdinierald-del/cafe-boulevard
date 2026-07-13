import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { perPackageCounts } from "@/data/vuln-scan";

export function PerPackageBar() {
  const data = perPackageCounts();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h3 className="mb-1 text-sm font-medium uppercase tracking-widest text-slate-400">Vulnerabilities by Package</h3>
      <p className="mb-4 text-xs text-slate-500">Bar color reflects the package's dominant severity</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24, top: 8, bottom: 8 }}>
            <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={12} width={160} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#e2e8f0",
              }}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.high >= d.count / 2 ? "#ef4444" : "#f59e0b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}