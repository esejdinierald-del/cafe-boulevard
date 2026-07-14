import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Send, Package, Trash2 } from "lucide-react";

interface SupplierOrder {
  id: string;
  supplier_name: string | null;
  items: Array<{ name: string; qty: number; unit: string }>;
  status: "draft" | "sent" | "received" | "cancelled";
  sent_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
}

const statusColor: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  received: "bg-green-500/20 text-green-300 border-green-500/40",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
};

export default function SupplierOrders() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [supplier, setSupplier] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("supplier_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((data as unknown as SupplierOrder[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const parseItems = (text: string) => {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(\w+)?$/);
        if (!m) return { name: line, qty: 1, unit: "cope" };
        return {
          name: m[1].trim(),
          qty: parseFloat(m[2].replace(",", ".")),
          unit: (m[3] || "cope").toLowerCase(),
        };
      });
  };

  const create = async () => {
    const items = parseItems(itemsText);
    if (items.length === 0) return toast.error("Shto të paktën një artikull");
    setLoading(true);
    const { error } = await supabase.from("supplier_orders").insert({
      supplier_name: supplier || null,
      items,
      notes: notes || null,
      status: "draft",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Porosia u krijua");
    setSupplier("");
    setItemsText("");
    setNotes("");
    load();
  };

  const setStatus = async (id: string, status: SupplierOrder["status"]) => {
    const patch: { status: SupplierOrder["status"]; sent_at?: string; received_at?: string } = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "received") patch.received_at = new Date().toISOString();
    const { error } = await supabase.from("supplier_orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Fshi këtë porosi?")) return;
    const { error } = await supabase.from("supplier_orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/manager" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" /> Porosi Furnitorë
            </h1>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Porosi e re
          </h2>
          <Input
            placeholder="Emri i furnitorit (opsional)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <Textarea
            placeholder={"Një artikull për rresht: emri sasia njesia\np.sh.:\nQumësht 12 litra\nKafe 5 kg"}
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            rows={5}
          />
          <Input
            placeholder="Shënime (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={create} disabled={loading}>
            <Plus className="h-4 w-4 mr-1" /> Krijo Porosinë
          </Button>
        </Card>

        <div className="space-y-3">
          {orders.length === 0 && (
            <p className="text-muted-foreground text-center py-8">S'ka porosi ende</p>
          )}
          {orders.map((o) => (
            <Card key={o.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <div className="font-semibold">{o.supplier_name || "Pa emër"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("sq-AL")}
                  </div>
                </div>
                <Badge className={statusColor[o.status]}>{o.status}</Badge>
              </div>
              <ul className="text-sm space-y-0.5 pl-4 list-disc">
                {o.items.map((it, i) => (
                  <li key={i}>
                    {it.name} — <b>{it.qty}</b> {it.unit}
                  </li>
                ))}
              </ul>
              {o.notes && <p className="text-xs text-muted-foreground italic">{o.notes}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                {o.status === "draft" && (
                  <Button size="sm" onClick={() => setStatus(o.id, "sent")}>
                    <Send className="h-3 w-3 mr-1" /> Dërgo
                  </Button>
                )}
                {o.status === "sent" && (
                  <Button size="sm" onClick={() => setStatus(o.id, "received")}>
                    ✓ Mbërriti
                  </Button>
                )}
                {o.status !== "cancelled" && o.status !== "received" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "cancelled")}>
                    Anullo
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(o.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}