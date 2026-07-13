import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { CLEAN_PACKAGES } from "@/data/vuln-scan";

export function CleanPackages() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 p-2 text-emerald-300">
            <CheckCircle2 size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-widest text-slate-400">Clean Packages</h3>
            <p className="text-xs text-slate-500">{CLEAN_PACKAGES.length} dependencies with no known advisories</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-white/5 p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {CLEAN_PACKAGES.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-emerald-500/10"
              >
                <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
                <span className="truncate" title={name}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}