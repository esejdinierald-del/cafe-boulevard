import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Printer, RefreshCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { printReceiptViaIframe } from "@/lib/receipt-print";
import { toast } from "sonner";

interface Job {
  id: string;
  station: string;
  kind: string;
  title: string | null;
  receipt_text: string;
  status: string;
  created_by: string | null;
  table_code: string | null;
  amount: number | null;
  attempts: number;
  created_at: string;
  printed_at: string | null;
}

const STATION = "arka";

const PrintStation = () => {
  const [passcode, setPasscode] = useState<string>(() => sessionStorage.getItem("print_station_pass") || "");
  const [authed, setAuthed] = useState<boolean>(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [enabled, setEnabled] = useState<boolean>(() => {
    return localStorage.getItem("print_station_enabled") === "1";
  });
  const processing = useRef<Set<string>>(new Set());
  const beepCtxRef = useRef<AudioContext | null>(null);

  const beep = useCallback(() => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = beepCtxRef.current || new Ctx();
      beepCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* ignore */ }
  }, []);

  const loadRecent = useCallback(async () => {
    if (!passcode) return;
    const { data, error } = await supabase.functions.invoke("print-station", {
      body: { action: "list_recent", station: STATION, adminPassword: passcode },
      headers: { "x-admin-passcode": passcode },
    });
    if ((data as any)?.error || error) {
      if (authed) toast.error((data as any)?.error || error?.message || "Gabim");
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setJobs(((data as any)?.data as Job[]) || []);
  }, [passcode, authed]);

  const processJob = useCallback(async (job: Job) => {
    if (processing.current.has(job.id)) return;
    if (job.status !== "pending") return;
    if (!enabled) return;
    processing.current.add(job.id);
    try {
      const { data: claimRes } = await supabase.functions.invoke("print-station", {
        body: { action: "claim", id: job.id, attempts: job.attempts, adminPassword: passcode },
        headers: { "x-admin-passcode": passcode },
      });
      if (!(claimRes as any)?.claimed) return;

      // Actually print — përdor iframe të izoluar (pa temën e app-it)
      beep();
      await printReceiptViaIframe(job.receipt_text, job.title || "Boulevard Cafe", {
        branded: job.kind === "close_table",
      });

      await supabase.functions.invoke("print-station", {
        body: { action: "mark_printed", id: job.id, adminPassword: passcode },
        headers: { "x-admin-passcode": passcode },
      });
      loadRecent();
    } catch (e) {
      console.error("[print-station] error", e);
      const newStatus = job.attempts + 1 >= 3 ? "failed" : "pending";
      await supabase.functions.invoke("print-station", {
        body: { action: "set_status", id: job.id, status: newStatus, adminPassword: passcode },
        headers: { "x-admin-passcode": passcode },
      });
    } finally {
      setTimeout(() => processing.current.delete(job.id), 3000);
    }
  }, [beep, enabled, loadRecent, passcode]);

  // Poll pending queue every 2.5s (no realtime — anon has no SELECT on print_jobs).
  useEffect(() => {
    if (!passcode) return;
    loadRecent();
    const poll = setInterval(loadRecent, 2500);
    return () => clearInterval(poll);
  }, [loadRecent, passcode]);

  // Auto-process pending jobs
  useEffect(() => {
    if (!enabled) return;
    const pending = jobs.filter((j) => j.status === "pending");
    if (pending.length === 0) return;
    // Process one at a time (window.print blocks anyway)
    processJob(pending[pending.length - 1]);
  }, [jobs, enabled, processJob]);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("print_station_enabled", next ? "1" : "0");
    if (next) {
      // Kick the audio context so beeps work without extra clicks
      beep();
      toast.success("Printer station aktive");
    } else {
      toast("Printer station u ndal");
    }
  };

  const requeue = async (job: Job) => {
    await supabase.functions.invoke("print-station", {
      body: { action: "requeue", id: job.id, adminPassword: passcode },
      headers: { "x-admin-passcode": passcode },
    });
    loadRecent();
  };

  const markPrinted = async (job: Job) => {
    await supabase.functions.invoke("print-station", {
      body: { action: "mark_printed", id: job.id, adminPassword: passcode },
      headers: { "x-admin-passcode": passcode },
    });
    loadRecent();
  };

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
        <Card className="p-6 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Printer className="h-5 w-5" /> Printer Station
          </h1>
          <p className="text-sm text-muted-foreground">Fut kodin e admin-it për të hapur stacionin e printimit.</p>
          <Input
            type="password"
            placeholder="Kodi admin"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { sessionStorage.setItem("print_station_pass", passcode); loadRecent(); } }}
          />
          <Button
            className="w-full"
            onClick={() => { sessionStorage.setItem("print_station_pass", passcode); loadRecent(); }}
          >
            Hyr
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Printer className="h-7 w-7" /> Printer Station · Arka
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kjo dritare printon automatikisht të gjitha biletat që dërgojnë kamarierët.
              Mos e mbyll gjatë punës. Këshillë: hape Chrome me{" "}
              <code className="bg-muted px-1 rounded">--kiosk-printing</code> për printim pa dialog.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pendingCount > 0 ? "default" : "secondary"} className="text-base px-3 py-1">
              Në pritje: {pendingCount}
            </Badge>
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">
                Të dështuara: {failedCount}
              </Badge>
            )}
            <Button
              onClick={toggleEnabled}
              variant={enabled ? "default" : "outline"}
              className={enabled ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {enabled ? "Aktiv ✓" : "Ndal"}
            </Button>
          </div>
        </div>

        {!enabled && (
          <Card className="p-4 border-yellow-500 bg-yellow-500/10">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Printer station është i ndalur. Klik "Ndal" për të filluar printimin automatik.
              </span>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {jobs.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Ende asnjë biletë. Kur kamarierët mbyllin tavolina, biletat do të shfaqen këtu dhe do të printohen menjëherë.
            </Card>
          )}
          {jobs.map((j) => (
            <Card
              key={j.id}
              className={`p-3 flex items-center gap-3 ${
                j.status === "pending" ? "border-primary animate-pulse" :
                j.status === "printing" ? "border-blue-500" :
                j.status === "failed" ? "border-red-500 bg-red-500/5" :
                ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{j.title || "Boulevard Cafe"}</span>
                  {j.table_code && <Badge variant="outline">Tav. {j.table_code}</Badge>}
                  {j.amount != null && <Badge variant="outline">{j.amount} L</Badge>}
                  <Badge
                    variant={
                      j.status === "printed" ? "secondary" :
                      j.status === "failed" ? "destructive" :
                      "default"
                    }
                  >
                    {j.status === "pending" && "Në pritje"}
                    {j.status === "printing" && "Duke printuar…"}
                    {j.status === "printed" && "Printuar"}
                    {j.status === "failed" && "Dështoi"}
                  </Badge>
                  {j.attempts > 0 && <span className="text-xs text-muted-foreground">×{j.attempts}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(j.created_at).toLocaleString("sq-AL")} · {j.created_by || "—"}
                </div>
              </div>
              <div className="flex gap-1">
                {j.status !== "printed" && (
                  <Button size="sm" variant="outline" onClick={() => requeue(j)}>
                    <RefreshCcw className="h-3 w-3 mr-1" /> Riprint
                  </Button>
                )}
                {j.status !== "printed" && (
                  <Button size="sm" variant="ghost" onClick={() => markPrinted(j)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Shëno
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrintStation;