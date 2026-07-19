import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, KeyRound, Trash2, Power, ShieldCheck, ShieldOff, Lock, Phone, Send } from "lucide-react";

interface Staff {
  id: string;
  name: string;
  role: "waiter" | "kitchen" | "manager";
  active: boolean;
  is_admin?: boolean;
  has_admin_password?: boolean;
  phone?: string;
  telegram_linked?: boolean;
}

const ROLES: Array<{ value: Staff["role"]; label: string }> = [
  { value: "waiter", label: "Kamarier" },
  { value: "kitchen", label: "Kuzhinë" },
  { value: "manager", label: "Menaxher" },
];

export const StaffManagerCard = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pinDialog, setPinDialog] = useState<Staff | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pwDialog, setPwDialog] = useState<Staff | null>(null);
  const [newAdminPw, setNewAdminPw] = useState("");
  const [form, setForm] = useState({ name: "", pin: "", role: "waiter" as Staff["role"], phone: "" });
  const [phoneDialog, setPhoneDialog] = useState<Staff | null>(null);
  const [newPhone, setNewPhone] = useState("");

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-staff", { body });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Gabim");
      return null;
    }
    return data;
  };

  const load = async () => {
    setLoading(true);
    const data = await call({ action: "list" });
    setLoading(false);
    if (data) setStaff((data as any).staff || []);
  };

  useEffect(() => { load(); }, []);

  const submitNew = async () => {
    if (!form.name.trim() || !/^\d{4}$/.test(form.pin)) {
      toast.error("Vendos emër dhe PIN 4 shifror");
      return;
    }
    const data = await call({ action: "create", name: form.name, pin: form.pin, role: form.role, phone: form.phone });
    if (data) {
      toast.success(`Kamarieri "${form.name}" u shtua`);
      setForm({ name: "", pin: "", role: "waiter", phone: "" });
      setCreating(false);
      load();
    }
  };

  const toggleActive = async (s: Staff) => {
    const data = await call({ action: "update", id: s.id, active: !s.active });
    if (data) { toast.success(`${s.name} u ${!s.active ? "aktivizua" : "çaktivizua"}`); load(); }
  };

  const changeRole = async (s: Staff, role: Staff["role"]) => {
    const data = await call({ action: "update", id: s.id, role });
    if (data) { toast.success("Roli u përditësua"); load(); }
  };

  const remove = async (s: Staff) => {
    if (!confirm(`Fshij "${s.name}"?`)) return;
    const data = await call({ action: "delete", id: s.id });
    if (data) { toast.success("U fshi"); load(); }
  };

  const resetPin = async () => {
    if (!pinDialog || !/^\d{4}$/.test(newPin)) { toast.error("PIN 4 shifror"); return; }
    const data = await call({ action: "update", id: pinDialog.id, pin: newPin });
    if (data) { toast.success("PIN-i u përditësua"); setPinDialog(null); setNewPin(""); }
  };

  const toggleAdmin = async (s: Staff) => {
    const data = await call({ action: "update", id: s.id, is_admin: !s.is_admin });
    if (data) { toast.success(`${s.name} — admin: ${!s.is_admin ? "aktiv" : "jo"}`); load(); }
  };

  const setAdminPassword = async () => {
    if (!pwDialog || newAdminPw.length < 4) { toast.error("Të paktën 4 karaktere"); return; }
    const data = await call({ action: "update", id: pwDialog.id, admin_password: newAdminPw });
    if (data) { toast.success("Fjalëkalimi admin u ruajt"); setPwDialog(null); setNewAdminPw(""); load(); }
  };

  const savePhone = async () => {
    if (!phoneDialog) return;
    const data = await call({ action: "update", id: phoneDialog.id, phone: newPhone });
    if (data) { toast.success("Nr. i telefonit u ruajt"); setPhoneDialog(null); setNewPhone(""); load(); }
  };

  const unlinkTelegram = async (s: Staff) => {
    if (!confirm(`Shkëput Telegram-in për "${s.name}"?`)) return;
    const data = await call({ action: "update", id: s.id, unlink_telegram: true });
    if (data) { toast.success("U shkëput Telegram"); load(); }
  };

  return (
    <Card className="glass-premium p-6 rounded-3xl shadow-[var(--shadow-elegant)]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-display font-bold gradient-text-gold">Kamarierët & Stafi</h2>
        <Button onClick={() => setCreating(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Shto
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar…</p>}

      {!loading && staff.length === 0 && (
        <p className="text-sm text-muted-foreground">Asnjë kamarier ende. Shto të parin me butonin lart.</p>
      )}

      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/40">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{s.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={s.role}
                  onChange={(e) => changeRole(s, e.target.value as Staff["role"])}
                  className="text-xs bg-background border border-border rounded px-2 py-1"
                >
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <Badge variant={s.active ? "default" : "secondary"} className="text-[10px]">
                  {s.active ? "Aktiv" : "Joaktiv"}
                </Badge>
                {s.phone && (
                  <Badge variant="outline" className="text-[10px]">{s.phone}</Badge>
                )}
                {s.telegram_linked && (
                  <Badge variant="outline" className="text-[10px] border-sky-500/50 text-sky-400">TG ✓</Badge>
                )}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setPhoneDialog(s); setNewPhone(s.phone || ""); }}
              title="Nr. Telefoni (Telegram)"
            >
              <Phone className="h-4 w-4" />
            </Button>
            {s.telegram_linked && (
              <Button size="icon" variant="ghost" onClick={() => unlinkTelegram(s)} title="Shkëput Telegram">
                <Send className="h-4 w-4 text-sky-400" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => setPinDialog(s)} title="Reset PIN">
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => toggleAdmin(s)} title={s.is_admin ? "Hiq admin" : "Bëj admin"}>
              {s.is_admin ? <ShieldCheck className="h-4 w-4 text-amber-400" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPwDialog(s)}
              disabled={!s.is_admin}
              title="Cakto fjalëkalim admin"
            >
              <Lock className={`h-4 w-4 ${s.has_admin_password ? "text-green-500" : "text-muted-foreground"}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => toggleActive(s)} title="Aktivizo/Çaktivizo">
              <Power className={`h-4 w-4 ${s.active ? "text-green-500" : "text-muted-foreground"}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(s)} title="Fshi">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Shto Kamarier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Emri"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="PIN (4 shifra)"
              inputMode="numeric"
              maxLength={4}
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          <Input
            placeholder="Nr. Telefoni (Telegram) — p.sh. 0691234567"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Staff["role"] })}
              className="w-full bg-background border border-border rounded px-3 py-2"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Anulo</Button>
            <Button onClick={submitNew}>Shto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PIN dialog */}
      <Dialog open={!!pinDialog} onOpenChange={(o) => { if (!o) { setPinDialog(null); setNewPin(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset PIN — {pinDialog?.name}</DialogTitle></DialogHeader>
          <Input
            placeholder="PIN i ri (4 shifra)"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPinDialog(null); setNewPin(""); }}>Anulo</Button>
            <Button onClick={resetPin}>Ruaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin password dialog */}
      <Dialog open={!!pwDialog} onOpenChange={(o) => { if (!o) { setPwDialog(null); setNewAdminPw(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fjalëkalim admin — {pwDialog?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Ky fjalëkalim është individual dhe përdoret vetëm nga ky staf për veprime admin (anulime, Arka, sasi inventari).
          </p>
          <Input
            type="password"
            placeholder="Fjalëkalim i ri (min 4 karaktere)"
            value={newAdminPw}
            onChange={(e) => setNewAdminPw(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPwDialog(null); setNewAdminPw(""); }}>Anulo</Button>
            <Button onClick={setAdminPassword}>Ruaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone dialog */}
      <Dialog open={!!phoneDialog} onOpenChange={(o) => { if (!o) { setPhoneDialog(null); setNewPhone(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nr. Telefoni — {phoneDialog?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Ky numër përdoret për lidhjen individuale me Telegram. Stafi i dërgon /start bot-it dhe ndan numrin e vet — sistemi e lidh automatikisht.
          </p>
          <Input
            placeholder="p.sh. 0691234567 ose +355691234567"
            inputMode="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPhoneDialog(null); setNewPhone(""); }}>Anulo</Button>
            <Button onClick={savePhone}>Ruaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};