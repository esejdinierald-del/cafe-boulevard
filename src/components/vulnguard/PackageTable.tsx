import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Copy, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { scan, Severity } from "@/data/vuln-scan";

type Filter = "all" | "high" | "moderate";

function SeverityPill({ level }: { level: Severity }) {
  const cls =
    level === "high"
      ? "text-red-300 bg-red-500/15 border-red-500/30"
      : "text-amber-200 bg-amber-500/15 border-amber-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${cls}`}>
      {level}
    </span>
  );
}

export function PackageTable() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    return scan.dependencies
      .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
      .filter((d) => filter === "all" || d.vulnerabilities.some((v) => v.severity === filter))
      .sort((a, b) =>
        sortDesc ? b.vulnerabilities.length - a.vulnerabilities.length : a.vulnerabilities.length - b.vulnerabilities.length,
      );
  }, [q, filter, sortDesc]);

  const copy = (name: string) => {
    navigator.clipboard.writeText(name);
    toast.success(`Copied ${name}`);
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "high", label: "High" },
    { id: "moderate", label: "Moderate" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-widest text-slate-400">Vulnerable Packages</h3>
          <p className="text-xs text-slate-500">Click a row to expand advisories</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search packages…"
              className="w-full rounded-full border border-white/10 bg-slate-950/60 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-white/30 focus:outline-none sm:w-64"
            />
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === t.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-slate-500">
              <th className="px-5 py-3 font-normal">Package</th>
              <th className="px-5 py-3 font-normal hidden md:table-cell">Version</th>
              <th
                className="px-5 py-3 font-normal hidden md:table-cell cursor-pointer select-none"
                onClick={() => setSortDesc((s) => !s)}
              >
                Vulns {sortDesc ? "↓" : "↑"}
              </th>
              <th className="px-5 py-3 font-normal">Severity</th>
              <th className="px-5 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No packages match your filters.
                </td>
              </tr>
            )}
            {rows.map((d) => {
              const isOpen = open === d.name;
              const hasHigh = d.vulnerabilities.some((v) => v.severity === "high");
              return (
                <Fragment key={d.name}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : d.name)}
                    className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                        <span className="font-medium text-slate-100">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-slate-400 tabular-nums">{d.version}</td>
                    <td className="px-5 py-4 hidden md:table-cell text-slate-200 tabular-nums">{d.vulnerabilities.length}</td>
                    <td className="px-5 py-4">
                      <SeverityPill level={hasHigh ? "high" : "moderate"} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(d.name);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-white/5 bg-slate-950/40">
                      <td colSpan={5} className="px-5 py-4">
                        <ul className="space-y-2">
                          {d.vulnerabilities.map((v, i) => (
                            <li key={i} className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                              <div className="flex items-start gap-3">
                                <SeverityPill level={v.severity} />
                                <span className="text-sm text-slate-200">{v.name}</span>
                              </div>
                              <a
                                href={v.link}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400 transition hover:text-slate-100"
                              >
                                Advisory <ExternalLink size={12} />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}