import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runHealthChecks, type HealthResult } from "@/lib/health-check";
import { buildBackupJson, downloadBackup } from "@/lib/admin-backup";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Download, FileText, AlertTriangle } from "lucide-react";

type Tab = "health" | "errors" | "fiscal" | "backup";

interface AppLog {
  id: string;
  event: string;
  severity: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface FiscalRow {
  id: string;
  fiscal_number: string;
  issued_at: string;
  total_amount: number;
  net_amount: number;
  vat_amount: number;
  source: string;
  operator_name: string | null;
  table_number: number | null;
}

function monthRange(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

const AdminTools = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("health");

  // Passcode gate
  useEffect(() => {
    if (sessionStorage.getItem("admin_tools_authed") === "1") {
      setAuthed(true);
      return;
    }
    const pw = window.prompt("Fjalëkalimi i adminit:");
    if (!pw) {
      navigate("/manager", { replace: true });
      return;
    }
    supabase.functions.invoke("verify-admin-passcode", { body: { passcode: pw } }).then(({ data, error }) => {
      if ((data as any)?.valid) {
        sessionStorage.setItem("admin_tools_authed", "1");
        setAuthed(true);
      } else {
        toast.error((data as any)?.error || error?.message || "Fjalëkalim i pasaktë");
        navigate("/manager", { replace: true });
      }
    });
  }, [navigate]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center">
        Duke verifikuar...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/manager")} className="p-2 rounded hover:bg-slate-800">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold">Mjete Admin</h1>
        </div>
      </header>

      <nav className="flex gap-1 px-4 py-2 border-b border-slate-800 overflow-x-auto">
        {(
          [
            { id: "health", label: "🩺 Health Check" },
            { id: "errors", label: "🐛 Errors" },
            { id: "fiscal", label: "🧾 Regjistri Fiskal" },
            { id: "backup", label: "💾 Backup" },
          ] as const
        ).map((t) => (
          <button type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
              tab === t.id ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {tab === "health" && <HealthTab />}
        {tab === "errors" && <ErrorsTab />}
        {tab === "fiscal" && <FiscalTab />}
        {tab === "backup" && <BackupTab />}
      </main>
    </div>
  );
};

function HealthTab() {
  const [results, setResults] = useState<HealthResult[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setResults(await runHealthChecks());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
  }, []);

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-slate-300 text-sm">
          {results.length > 0 && (
            <>
              <span className="text-green-400 font-semibold">{okCount} OK</span>
              {failCount > 0 && <span className="text-red-400 ml-3 font-semibold">{failCount} FAIL</span>}
            </>
          )}
        </div>
        <button type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Ekzekuto
        </button>
      </div>
      <ul className="space-y-1">
        {results.map((r, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              r.ok ? "border-green-500/30 bg-green-500/5" : "border-red-500/40 bg-red-500/10"
            }`}
          >
            {r.ok ? (
              <CheckCircle2 size={18} className="text-green-400 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium">{r.name}</div>
              {r.detail && <div className="text-xs text-slate-400 mt-1">{r.detail}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorsTab() {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [severity, setSeverity] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("app_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (severity !== "all") q = q.eq("severity", severity);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setLogs((data as AppLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [severity]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "info", "warning", "error", "critical"].map((s) => (
          <button type="button"
            key={s}
            onClick={() => setSeverity(s)}
            className={`px-2 py-1 rounded text-xs ${
              severity === s ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {s}
          </button>
        ))}
        <button type="button" onClick={load} disabled={loading} className="ml-auto px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs">
          <RefreshCw size={12} className={`inline mr-1 ${loading ? "animate-spin" : ""}`} /> Rifresko
        </button>
      </div>
      {logs.length === 0 ? (
        <div className="text-slate-500 text-sm text-center py-8">Asnjë log për këtë filtër.</div>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    l.severity === "critical"
                      ? "bg-red-600"
                      : l.severity === "error"
                      ? "bg-red-500/70"
                      : l.severity === "warning"
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-600"
                  }`}
                >
                  {l.severity}
                </span>
                <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString("sq-AL")}</span>
              </div>
              <div className="mt-1 text-sm font-medium break-words">{l.event}</div>
              {l.metadata && (
                <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap break-all bg-slate-900 p-2 rounded max-h-40 overflow-auto">
                  {JSON.stringify(l.metadata, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FiscalTab() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [rows, setRows] = useState<FiscalRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { start, end } = monthRange(month);
    const { data, error } = await supabase
      .from("fiscal_receipts")
      .select("id, fiscal_number, issued_at, total_amount, net_amount, vat_amount, source, operator_name, table_number")
      .gte("issued_at", start)
      .lt("issued_at", end)
      .order("issued_at", { ascending: true })
      .limit(1000);
    if (error) toast.error(error.message);
    setRows((data as FiscalRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [month]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += Number(r.total_amount);
      acc.net += Number(r.net_amount);
      acc.vat += Number(r.vat_amount);
      return acc;
    },
    { gross: 0, net: 0, vat: 0 },
  );

  const exportCSV = () => {
    const header = "Nr Fiskal,Data,Ora,Neto (L),TVSH (L),Bruto (L),Platforma,Kamarier,Tavolina\n";
    const body = rows
      .map((r) => {
        const d = new Date(r.issued_at);
        const date = d.toLocaleDateString("sq-AL");
        const time = d.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" });
        return [
          r.fiscal_number,
          date,
          time,
          Number(r.net_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.total_amount).toFixed(2),
          r.source,
          r.operator_name || "",
          r.table_number ?? "",
        ].join(",");
      })
      .join("\n");
    const csv = header + body;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiskal-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
        />
        <button type="button"
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50"
        >
          <Download size={14} /> Eksport CSV
        </button>
        <span className="ml-auto text-xs text-slate-400">{rows.length} fatura</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-xs text-slate-400">Neto</div>
          <div className="text-lg font-bold">{totals.net.toFixed(2)} L</div>
        </div>
        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-xs text-slate-400">TVSH (20%)</div>
          <div className="text-lg font-bold text-amber-300">{totals.vat.toFixed(2)} L</div>
        </div>
        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-xs text-slate-400">Bruto</div>
          <div className="text-lg font-bold text-green-300">{totals.gross.toFixed(2)} L</div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <div>
          Ky është regjistër i brendshëm për deklarim tatimor. Ai <b>nuk zëvendëson</b> printerin fiskal të certifikuar
          nga Tatimet. TVSH-ja llogaritet 20% mbi çmimin final.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 border-b border-slate-700">
            <tr>
              <th className="text-left p-2">Nr Fiskal</th>
              <th className="text-left p-2">Data</th>
              <th className="text-right p-2">Neto</th>
              <th className="text-right p-2">TVSH</th>
              <th className="text-right p-2">Bruto</th>
              <th className="text-left p-2">Burimi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="p-2 font-mono text-xs">{r.fiscal_number}</td>
                <td className="p-2 text-xs">
                  {new Date(r.issued_at).toLocaleString("sq-AL", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="p-2 text-right">{Number(r.net_amount).toFixed(2)}</td>
                <td className="p-2 text-right text-amber-300">{Number(r.vat_amount).toFixed(2)}</td>
                <td className="p-2 text-right font-semibold">{Number(r.total_amount).toFixed(2)}</td>
                <td className="p-2 text-xs">{r.source}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 text-sm">
                  Asnjë faturë për këtë muaj.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupTab() {
  const [busy, setBusy] = useState(false);

  const doBackup = async () => {
    setBusy(true);
    try {
      const json = await buildBackupJson();
      downloadBackup(json);
      toast.success("Backup u shkarkua ✓");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <FileText size={16} /> Backup i Konfigurimit
        </div>
        <p className="text-sm text-slate-400">
          Shkarkon një skedar JSON me: menu, kategori, tavolinat, staf, receta, materiale, cilësime. Përdore për
          arkivim ose migrim.
        </p>
        <p className="text-xs text-slate-500">
          Nuk përfshin: porositë, transaksionet, logje — këto janë historik operacional dhe qëndrojnë vetëm në DB.
        </p>
        <button type="button"
          onClick={doBackup}
          disabled={busy}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50"
        >
          <Download size={16} /> {busy ? "Duke përgatitur..." : "Shkarko Backup"}
        </button>
      </div>

      <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
        Restaurimi nga JSON kërkon ndërhyrje manuale në DB — ruaje skedarin në një vend të sigurt.
      </div>
    </div>
  );
}

export default AdminTools;