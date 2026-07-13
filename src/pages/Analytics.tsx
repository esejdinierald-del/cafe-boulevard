import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface Txn {
  id: string;
  created_at: string;
  amount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  type: string;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("sq-AL")} L`;

export default function Analytics() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/manager-login", { replace: true });
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "manager")
        .single();
      if (!roleData) {
        toast.error("Nuk keni akses");
        navigate("/", { replace: true });
        return;
      }
      setAuthorized(true);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, created_at, amount, items, type")
        .eq("type", "sale")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: true });
      if (!error && data) setTxns(data as unknown as Txn[]);
      setLoading(false);
    })();
  }, [authorized]);

  const daily = useMemo(() => {
    const map = new Map<string, number>();
    txns.forEach((t) => {
      const d = new Date(t.created_at).toISOString().slice(0, 10);
      map.set(d, (map.get(d) || 0) + Number(t.amount || 0));
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date: date.slice(5), total }));
  }, [txns]);

  const topItems = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    txns.forEach((t) => {
      (t.items || []).forEach((it) => {
        const cur = map.get(it.name) || { qty: 0, revenue: 0 };
        cur.qty += Number(it.quantity || 0);
        cur.revenue += Number(it.quantity || 0) * Number(it.price || 0);
        map.set(it.name, cur);
      });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [txns]);

  const totalRev = daily.reduce((s, d) => s + d.total, 0);
  const avgDay = daily.length ? totalRev / daily.length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/manager" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Analitikë (30 ditë)
          </h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Duke ngarkuar…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Xhiro total</div>
                <div className="text-2xl font-bold">{fmt(totalRev)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Mesatare ditore</div>
                <div className="text-2xl font-bold">{fmt(avgDay)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Transaksione</div>
                <div className="text-2xl font-bold">{txns.length}</div>
              </Card>
            </div>

            <Card className="p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Xhiro ditore
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h2 className="font-semibold mb-3">Top 10 produkte (sasi)</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topItems} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}