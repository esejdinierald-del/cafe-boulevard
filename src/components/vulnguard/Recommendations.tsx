import { AlertOctagon, AlertTriangle, ArrowUpRight } from "lucide-react";

const items = [
  {
    pkg: "vite-plugin-pwa",
    level: "critical" as const,
    reason: "18 vulnerabilities including serialize-javascript RCE, Babel arbitrary code, Rollup path traversal.",
  },
  {
    pkg: "react-router-dom",
    level: "high" as const,
    reason: "XSS via open redirect and same-origin redirect handling.",
  },
  {
    pkg: "recharts",
    level: "moderate" as const,
    reason: "Lodash prototype pollution and _.template code injection propagate through transitive deps.",
  },
  {
    pkg: "@supabase/supabase-js",
    level: "moderate" as const,
    reason: "Bundled ws version is vulnerable to memory disclosure and exhaustion DoS.",
  },
];

const styles = {
  critical: { icon: AlertOctagon, cls: "text-red-300 bg-red-500/15 border-red-500/30" },
  high: { icon: AlertTriangle, cls: "text-red-300 bg-red-500/15 border-red-500/30" },
  moderate: { icon: AlertTriangle, cls: "text-amber-200 bg-amber-500/15 border-amber-500/30" },
} as const;

export function Recommendations() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h3 className="mb-1 text-sm font-medium uppercase tracking-widest text-slate-400">Recommended Actions</h3>
      <p className="mb-4 text-xs text-slate-500">Ordered by risk. Upgrade in this sequence.</p>
      <ol className="space-y-2">
        {items.map((it, i) => {
          const s = styles[it.level];
          const Icon = s.icon;
          return (
            <li
              key={it.pkg}
              className="group flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]"
            >
              <div className={`rounded-lg border p-2 ${s.cls}`}>
                <Icon size={16} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 tabular-nums">#{i + 1}</span>
                  <span className="font-medium text-slate-100">Upgrade {it.pkg}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${s.cls}`}>
                    {it.level}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{it.reason}</p>
              </div>
              <ArrowUpRight
                size={16}
                className="mt-1 text-slate-600 transition group-hover:text-slate-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}