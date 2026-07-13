import { Copy, Download, Shield } from "lucide-react";
import { toast } from "sonner";
import { scan } from "@/data/vuln-scan";

export function Header() {
  const shortId = `${scan.projectId.slice(0, 8)}…${scan.projectId.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(scan.projectId);
    toast.success("Project ID copied");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vulnerability-report-${scan.scanDate.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scanDate = new Date(scan.scanDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
          <Shield size={22} strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">VulnGuard</h1>
          <p className="text-sm text-slate-400">Dependency Vulnerability Report</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Scan · {scanDate}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
          title={scan.projectId}
        >
          <span className="tabular-nums">{shortId}</span>
          <Copy size={12} />
        </button>
        <button
          onClick={exportJson}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          <Download size={14} /> Export JSON
        </button>
      </div>
    </header>
  );
}