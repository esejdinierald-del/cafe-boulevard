import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User } from "lucide-react";

interface Props {
  shiftToken: string;
  onSuccess: (name: string, role: string) => void;
}

interface StaffName { name: string; role: string }

export const StaffPinLogin = ({ shiftToken, onSuccess }: Props) => {
  const [staff, setStaff] = useState<StaffName[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("list-staff-names", { body: {} });
      setLoading(false);
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Gabim");
        return;
      }
      const list = ((data as any).staff || []) as StaffName[];
      setStaff(list);
      if (list.length > 0) setSelected(list[0].name);
    })();
  }, []);

  const submit = async () => {
    if (!selected || !/^\d{4}$/.test(pin)) { toast.error("Zgjidh emrin dhe fut PIN-in 4 shifror"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("verify-staff-pin", {
      body: { name: selected, pin, shiftToken },
    });
    setSubmitting(false);
    const errMsg = (data as any)?.error || error?.message;
    if (errMsg) { toast.error(errMsg); return; }
    const d = data as { id?: string; name: string; role: string; is_admin?: boolean };
    if (d.id) localStorage.setItem("staff_id", d.id);
    localStorage.setItem("staff_name", d.name);
    localStorage.setItem("staff_role", d.role);
    localStorage.setItem("staff_is_admin", d.is_admin ? "1" : "0");
    toast.success(`Mirë se erdhe, ${d.name}!`);
    onSuccess(d.name, d.role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-sm w-full p-6 space-y-5">
        <div className="text-center space-y-1">
          <User className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-xl font-bold">Identifikohu</h1>
          <p className="text-sm text-muted-foreground">Zgjidh emrin dhe fut PIN-in tënd</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground">
            Asnjë kamarier i regjistruar. Menaxheri duhet t'i shtojë nga paneli.
          </p>
        ) : (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2"
            >
              {staff.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.role === "waiter" ? "Kamarier" : s.role === "kitchen" ? "Kuzhinë" : "Menaxher"})
                </option>
              ))}
            </select>
            <Input
              placeholder="PIN (4 shifra)"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center text-2xl tracking-widest"
            />
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hyr"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};