import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  is_critical: boolean;
}

export default function LowStockCard() {
  const [items, setItems] = useState<Material[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("raw_materials")
      .select("id, name, quantity, unit, min_threshold, is_critical");
    const rows = ((data as unknown as Material[]) || []).filter(
      (m) => m.min_threshold > 0 && m.quantity <= m.min_threshold
    );
    setItems(rows);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("low-stock")
      .on("postgres_changes", { event: "*", schema: "public", table: "raw_materials" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <Card className="p-4 border-yellow-500/40 bg-yellow-500/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-yellow-400" />
        <h3 className="font-semibold text-yellow-200">Stok kritik ({items.length})</h3>
        <Link to="/porosi-furnitor" className="ml-auto text-xs underline text-yellow-300">
          Bëj porosi
        </Link>
      </div>
      <ul className="text-sm space-y-1">
        {items.map((m) => (
          <li key={m.id} className="flex justify-between">
            <span>{m.name}</span>
            <span className={m.quantity <= 0 ? "text-red-400 font-bold" : "text-yellow-300"}>
              {m.quantity} {m.unit} / min {m.min_threshold}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}