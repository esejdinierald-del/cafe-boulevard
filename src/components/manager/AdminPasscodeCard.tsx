import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export const AdminPasscodeCard = () => {
  const [isSet, setIsSet] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    const { data, error } = await supabase.functions.invoke("manage-admin-passcode", {
      body: { action: "status" },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Gabim");
      return;
    }
    setIsSet(!!(data as any).isSet);
  };

  useEffect(() => { loadStatus(); }, []);

  const save = async () => {
    if (pw.length < 4) { toast.error("Të paktën 4 karaktere"); return; }
    if (pw !== confirmPw) { toast.error("Fjalëkalimet nuk përputhen"); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-admin-passcode", {
      body: { action: "set", newPasscode: pw },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Gabim");
      return;
    }
    toast.success("Fjalëkalimi u përditësua");
    setPw(""); setConfirmPw(""); loadStatus();
  };

  return (
    <Card className="glass-premium p-6 rounded-3xl shadow-[var(--shadow-elegant)]">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-display font-bold gradient-text-gold">Fjalëkalimi i Admin-it</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Përdoret në Arkë për anulimin e artikujve dhe të porosive.
      </p>
      <div className="mb-4">
        {isSet === null ? (
          <Badge variant="secondary">Duke kontrolluar…</Badge>
        ) : isSet ? (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/40">I caktuar</Badge>
        ) : (
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40">Duke përdorur default (2025)</Badge>
        )}
      </div>
      <div className="space-y-3">
        <Input
          type="password"
          placeholder="Fjalëkalimi i ri"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Konfirmo fjalëkalimin"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
        />
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Duke ruajtur…" : "Ruaj fjalëkalimin"}
        </Button>
      </div>
    </Card>
  );
};