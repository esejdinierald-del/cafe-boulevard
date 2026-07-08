import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    const { data } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("station", STATION)
      .order("created_at", { ascending: false })
      .limit(30);
    setJobs((data as unknown as Job[]) || []);
  }, []);

  const processJob = useCallback(async (job: Job) => {
    if (processing.current.has(job.id)) return;
    if (job.status !== "pending") return;
    if (!enabled) return;
    processing.current.add(job.id);
    try {
      // Claim: mark printing + increment attempts
      const { data: claim, error: claimErr } = await supabase
        .from("print_jobs")
        .update({ status: "printing", attempts: job.attempts + 1 })
        .eq("id", job.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimErr || !claim) {
        // Someone else claimed it, or update denied.
        return;
      }

      // Actually print — përdor iframe të izoluar (pa temën e app-it)
      beep();
      await printReceiptViaIframe(job.receipt_text, job.title || "Bileta");

      await supabase
        .from("print_jobs")
        .update({ status: "printed", printed_at: new Date().toISOString() })
        .eq("id", job.id);
      loadRecent();
    } catch (e) {
      console.error("[print-station] error", e);
      const newStatus = job.attempts + 1 >= 3 ? "failed" : "pending";
      await supabase.from("print_jobs").update({ status: newStatus }).eq("id", job.id);
    } finally {
      setTimeout(() => processing.current.delete(job.id), 3000);
    }
  }, [beep, enabled, loadRecent]);

  // Poll pending queue every 2s + realtime subscribe
  useEffect(() => {
    loadRecent();
    const ch = supabase
      .channel("print-station")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "print_jobs" },
        () => loadRecent(),
      )
      .subscribe();
    const poll = setInterval(loadRecent, 2500);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [loadRecent]);

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
    await supabase
      .from("print_jobs")
      .update({ status: "pending", attempts: 0 })
      .eq("id", job.id);
    loadRecent();
  };

  const markPrinted = async (job: Job) => {
    await supabase
      .from("print_jobs")
      .update({ status: "printed", printed_at: new Date().toISOString() })
      .eq("id", job.id);
    loadRecent();
  };

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

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
                  <span className="font-semibold">{j.title || "Bileta"}</span>
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