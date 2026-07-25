import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import boulevardLogo from "@/assets/boulevard-logo.png";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  staffUrl: string;
  needsQr?: boolean;
  onAdminUnlock?: (adminPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

export function QRCurtain({ staffUrl, needsQr, onAdminUnlock }: Props) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminUnlock = async () => {
    if (!pw.trim()) return;
    setLoading(true);
    try {
      const res = await onAdminUnlock?.(pw.trim());
      if (!res?.ok) {
        toast.error(res?.error || "Fjalëkalim i pasaktë");
        return;
      }
      toast.success("Dashboard u hap");
      setPw("");
    } catch (e) {
      toast.error("Gabim rrjeti");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={boulevardLogo} alt="Boulevard Café" className="w-20 h-20 mx-auto rounded-2xl shadow-lg object-contain" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Boulevard Café</h1>
          <p className="text-muted-foreground text-sm mt-1">Dashboard i Stafit</p>
        </div>
        {staffUrl && !needsQr ? (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl inline-block shadow-lg">
              <QRCodeSVG value={staffUrl} size={220} />
            </div>
            <p className="text-sm text-muted-foreground">
              Skano me telefon nga <strong>/staff</strong> për të hapur dashboard-in
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Njoftimet zanore janë aktive edhe tani</span>
            </div>
          </div>
        ) : needsQr ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground font-semibold">Skano QR-në e lokalit</p>
            <p className="text-xs text-muted-foreground">
              Për siguri, hapja e këtij dashboard-i tashmë kërkon skanim të QR-së së lokalit
              (të vendosur në zonën e stafit) ose një hapje të mëparshme aktive në këtë pajisje.
            </p>
            <div className="border-t border-border pt-4 space-y-2 text-left">
              <p className="text-xs text-muted-foreground text-center">
                ose hyr si <strong>admin</strong> me fjalëkalim:
              </p>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAdminUnlock(); }}
                placeholder="Fjalëkalimi admin"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                autoFocus
              />
              <button
                onClick={() => void handleAdminUnlock()}
                disabled={loading || !pw.trim()}
                className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                {loading ? "Duke hapur…" : "Hap dashboard-in"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground animate-pulse">Duke gjeneruar QR kodin...</p>
        )}
      </div>
    </div>
  );
}