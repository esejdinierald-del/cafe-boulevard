import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json().catch(() => ({}));
    const { action, id, token, shift_start, shift_end, adminPassword, qrSecret } = requestBody;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Helper: check current venue QR secret against provided value.
    const readVenueQrSecret = async (): Promise<string | null> => {
      const { data } = await supabase
        .from("app_settings").select("value").eq("key", "venue_qr_secret").maybeSingle();
      return (data?.value as string | undefined) ?? null;
    };

    // ACTION: get_qr_secret — admin-only, returns current venue QR secret
    if (action === "get_qr_secret") {
      if (!adminPassword) {
        return new Response(JSON.stringify({ error: "Mungon fjalëkalimi" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: setting } = await supabase
        .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
      const expectedHash = setting?.value;
      if (!expectedHash) {
        return new Response(JSON.stringify({ error: "Admin passcode nuk është konfiguruar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const providedHash = await sha256(String(adminPassword));
      if (providedHash !== expectedHash) {
        return new Response(JSON.stringify({ error: "Fjalëkalim i pasaktë" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const secret = await readVenueQrSecret();
      return new Response(
        JSON.stringify({ qrSecret: secret }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: rotate_qr_secret — admin-only, replaces venue QR secret.
    // Existing already-issued shift_tokens keep working until natural expiry.
    if (action === "rotate_qr_secret") {
      if (!adminPassword) {
        return new Response(JSON.stringify({ error: "Mungon fjalëkalimi" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: setting } = await supabase
        .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
      const expectedHash = setting?.value;
      if (!expectedHash) {
        return new Response(JSON.stringify({ error: "Admin passcode nuk është konfiguruar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const providedHash = await sha256(String(adminPassword));
      if (providedHash !== expectedHash) {
        return new Response(JSON.stringify({ error: "Fjalëkalim i pasaktë" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const newSecret = crypto.randomUUID();
      const { error: upErr } = await supabase.from("app_settings").upsert({
        key: "venue_qr_secret",
        value: newSecret,
        updated_at: new Date().toISOString(),
      });
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response(
        JSON.stringify({ qrSecret: newSecret }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: admin_bypass — verify admin passcode and return an active
    // shift token (creates one covering the next 12h if none is active).
    if (action === "admin_bypass") {
      if (!adminPassword) {
        return new Response(JSON.stringify({ error: "Mungon fjalëkalimi" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      maybeCleanup();
      const rl = checkRateLimit({
        key: clientKey(req, "manage-shift:admin_bypass"),
        max: 5,
        windowMs: 5 * 60_000,
        blockMs: 15 * 60_000,
      });
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec) } }
        );
      }
      const { data: setting } = await supabase
        .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
      const expectedHash = setting?.value;
      if (!expectedHash) {
        return new Response(JSON.stringify({ error: "Admin passcode nuk është konfiguruar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const providedHash = await sha256(String(adminPassword));
      if (providedHash !== expectedHash) {
        return new Response(JSON.stringify({ error: "Fjalëkalim i pasaktë" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Return existing active token if any
      const { data: existing } = await supabase
        .from("shift_tokens")
        .select("token, shift_end")
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({ token: existing.token, shift_end: existing.shift_end }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create a new 12h token
      const start = new Date();
      const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
      const newToken = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      const { error } = await supabase.from("shift_tokens").insert({
        token: newToken,
        shift_start: start.toISOString(),
        shift_end: end.toISOString(),
        unlocked: true,
      });
      if (error) {
        return new Response(JSON.stringify({ error: "Failed to create token" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response(
        JSON.stringify({ token: newToken, shift_end: end.toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actions that require manager authentication.
    // `get_or_create` is intentionally public: the counter dashboard opens
    // without login and must display the QR curtain for staff to unlock.
    const MANAGER_ACTIONS = ['create', 'extend', 'close'];

    if (MANAGER_ACTIONS.includes(action)) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const { data: { user } } = await supabaseAnon.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['manager', 'admin'])
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Manager access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ACTION: get_or_create — fetch active shift token or create one
    if (action === "get_or_create") {
      // Require the venue QR secret to prevent anonymous callers from
      // silently minting a valid shift token. Existing tokens issued before
      // this change keep working via `check_unlock` in the client.
      const currentSecret = await readVenueQrSecret();
      if (!currentSecret || !qrSecret || String(qrSecret) !== currentSecret) {
        return new Response(
          JSON.stringify({ needsQr: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("manage-shift get_or_create:start", {
        hasShiftStart: Boolean(shift_start),
        hasShiftEnd: Boolean(shift_end),
      });

      const resolveShiftWindow = () => {
        if (shift_start && shift_end) {
          return { start: String(shift_start), end: String(shift_end) };
        }

        // Backward-compatible fallback: older/cached dashboards may call
        // get_or_create without explicit times. Compute the active café shift
        // server-side so QR generation never gets stuck on a 400 response.
        const current = new Date();
        const romeParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Rome",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          hour12: false,
        }).formatToParts(current);
        const part = (type: string) => romeParts.find((p) => p.type === type)?.value ?? "00";
        const year = Number(part("year"));
        const month = Number(part("month"));
        const day = Number(part("day"));
        const hour = Number(part("hour"));

        const makeRomeDate = (baseDayOffset: number, shiftHour: number) => {
          // Build from a UTC noon anchor to avoid month/year rollover pitfalls,
          // then use an ISO string. Existing client code already sends ISO UTC.
          const date = new Date(Date.UTC(year, month - 1, day + baseDayOffset, shiftHour - 1, 0, 0, 0));
          return date.toISOString();
        };

        if (hour >= 3 && hour < 15) {
          return { start: makeRomeDate(0, 3), end: makeRomeDate(0, 15) };
        }
        if (hour >= 15) {
          return { start: makeRomeDate(0, 15), end: makeRomeDate(1, 3) };
        }
        return { start: makeRomeDate(-1, 15), end: makeRomeDate(0, 3) };
      };

      const shiftWindow = resolveShiftWindow();
      const startDate = new Date(shiftWindow.start);
      const endDate = new Date(shiftWindow.end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        console.error("manage-shift get_or_create:invalid_window", shiftWindow);
        return new Response(
          JSON.stringify({ error: "Invalid shift window" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing active token. Use limit(1) instead of maybeSingle() so
      // overlapping active rows never throw PGRST116 and leave the dashboard
      // waiting for a QR code.
      const { data: existingRows, error: existingError } = await supabase
        .from("shift_tokens")
        .select("token, unlocked, shift_start, shift_end, created_at")
        .gte("shift_end", now)
        .lte("shift_start", now)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingError) {
        console.error("manage-shift get_or_create:select_error", {
          code: existingError.code,
          message: existingError.message,
          details: existingError.details,
        });
        return new Response(
          JSON.stringify({ error: "Failed to read active shift token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const existing = existingRows?.[0];

      if (existing) {
        console.log("manage-shift get_or_create:existing", {
          unlocked: existing.unlocked,
          shift_start: existing.shift_start,
          shift_end: existing.shift_end,
        });
        return new Response(
          JSON.stringify({
            token: existing.token,
            unlocked: existing.unlocked,
            shift_start: existing.shift_start,
            shift_end: existing.shift_end,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate new token — full random UUID, not a time-derived formula.
      const newToken = crypto.randomUUID();
      const { error } = await supabase.from("shift_tokens").insert({
        token: newToken,
        shift_start: shiftWindow.start,
        shift_end: shiftWindow.end,
        unlocked: true,
      });

      if (error) {
        console.error("manage-shift get_or_create:insert_error", {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return new Response(
          JSON.stringify({ error: "Failed to create shift token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("manage-shift get_or_create:created", {
        shift_start: shiftWindow.start,
        shift_end: shiftWindow.end,
      });

      return new Response(
        JSON.stringify({
          token: newToken,
          unlocked: true,
          shift_start: shiftWindow.start,
          shift_end: shiftWindow.end,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: check_unlock — poll if token is unlocked
    if (action === "check_unlock") {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Missing token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data } = await supabase
        .from("shift_tokens")
        .select("unlocked")
        .eq("token", token)
        .maybeSingle();

      return new Response(
        JSON.stringify({ unlocked: data?.unlocked ?? false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: complete — complete a service_request or order
    if (action === "complete" || action === "cancel") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token is active
      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { type } = requestBody as { type?: string | null };
      // We already parsed the body above so use the original parsed values
    }

    // ACTION: complete_request — complete a service request
    if (action === "complete_request") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const status = action === "complete_request" ? "completed" : "cancelled";
      const { error } = await supabase
        .from("service_requests")
        .update({ status, completed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to update" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: cancel_request
    if (action === "cancel_request") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("service_requests")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to cancel" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: complete_order
    if (action === "complete_order") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1) Ngarko porosinë e klientit
      const { data: orderRow, error: fetchErr } = await supabase
        .from("orders")
        .select("id, table_number, items, notes, status")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr || !orderRow) {
        return new Response(
          JSON.stringify({ error: "Porosia nuk u gjet" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if ((orderRow as any).status && (orderRow as any).status !== "pending") {
        return new Response(
          JSON.stringify({ error: "Porosia s'është më në pritje" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2) Ndërto items të pasuruar nga menu_items (çmimi real, jo nga klienti)
      const rawItems: any[] = Array.isArray((orderRow as any).items) ? (orderRow as any).items : [];
      const productIds = rawItems
        .map((i: any) => i?.productId || i?.id)
        .filter((x: any) => typeof x === "string");

      if (productIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "Porosia s'ka artikuj të vlefshëm" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("id, name, price, for_bar, for_kitchen, is_active, offer_price, offer_start_time, offer_end_time")
        .in("id", productIds);
      const menuMap = new Map((menuItems ?? []).map((m: any) => [m.id, m]));

      // Verifiko çdo produkt aktiv
      for (const pid of productIds) {
        const m: any = menuMap.get(pid);
        if (!m || m.is_active === false) {
          return new Response(
            JSON.stringify({ error: `Produkti ${pid} s'është i disponueshëm` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const nowRome = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
      const activePrice = (m: any): number => {
        if (!m.offer_price || !m.offer_start_time || !m.offer_end_time) return Number(m.price);
        const s = String(m.offer_start_time).slice(0, 5);
        const e = String(m.offer_end_time).slice(0, 5);
        const active = s > e ? (nowRome >= s || nowRome <= e) : (nowRome >= s && nowRome <= e);
        return active ? Number(m.offer_price) : Number(m.price);
      };

      const enriched = rawItems
        .map((ci: any) => {
          const pid = ci?.productId || ci?.id;
          const m: any = menuMap.get(pid);
          if (!m) return null;
          return {
            productId: pid,
            name: m.name,
            price: activePrice(m),
            quantity: Number(ci?.quantity || 1),
            notes: ci?.notes || "",
            forBar: m.for_bar ?? true,
            forKitchen: m.for_kitchen ?? false,
          };
        })
        .filter(Boolean) as any[];

      if (enriched.length === 0) {
        return new Response(
          JSON.stringify({ error: "S'u gjetën produkte të vlefshme në menu" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalAmount = enriched.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

      // Rrugëzo në tavolinën virtuale "Porosi Online" (#0) — porositë e klientit
      // shfaqen individualisht dhe s'bien në rregullat normale të kyçjes.
      const originalTableNumber = (orderRow as any).table_number ? Number((orderRow as any).table_number) : null;
      const { data: onlineT } = await supabase
        .from("tables").select("id").eq("number", 0).maybeSingle();
      const onlineTableId: string | null = (onlineT as any)?.id ?? null;

      const clientLabel = originalTableNumber
        ? `Klient · Tavolina #${originalTableNumber}`
        : `Klient · Takeaway`;
      const combinedNotes = [
        `${clientLabel} (Ref: ${(orderRow as any).id})`,
        (orderRow as any).notes ? String((orderRow as any).notes) : null,
      ].filter(Boolean).join(" | ");

      const { data: posOrder, error: posErr } = await supabase
        .from("pos_orders")
        .insert({
          table_id: onlineTableId,
          table_number: 0,
          mode: "table",
          items: enriched,
          status: "open",
          total_amount: totalAmount,
          operator_name: "Klient (Menu)",
          notes: combinedNotes,
          source: "client",
        })
        .select()
        .single();

      if (posErr || !posOrder) {
        console.error("complete_order: pos_orders insert failed:", posErr);
        return new Response(
          JSON.stringify({ error: `Krijimi i porosisë POS dështoi: ${posErr?.message || "unknown"}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const barItems = enriched.filter((i) => i.forBar);
      const kitchenItems = enriched.filter((i) => i.forKitchen);
      const splits: any[] = [];
      if (barItems.length > 0) splits.push({ order_id: posOrder.id, type: "bar", items: barItems, status: "pending" });
      if (kitchenItems.length > 0) splits.push({ order_id: posOrder.id, type: "kitchen", items: kitchenItems, status: "pending" });
      if (splits.length > 0) {
        const { error: splitErr } = await supabase.from("order_items_split").insert(splits);
        if (splitErr) {
          // Rollback pos_orders që të mos mbetet porosi "e varur"
          await supabase.from("pos_orders").delete().eq("id", posOrder.id);
          console.error("complete_order: splits insert failed:", splitErr);
          return new Response(
            JSON.stringify({ error: `Dërgimi te Bar/Kuzhinë dështoi: ${splitErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // 3) Vetëm tani shëno klient orders si të përmbyllur
      const { error: updErr } = await supabase
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (updErr) {
        console.error("complete_order: orders update failed (POS u krijua):", updErr);
        // POS u krijua me sukses — mos e rrëzo veprimin.
      }

      return new Response(
        JSON.stringify({ success: true, posOrderId: posOrder.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: cancel_order
    if (action === "cancel_order") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to cancel order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: delete_request
    if (action === "delete_request") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("service_requests")
        .delete()
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to delete" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: delete_order
    if (action === "delete_order") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to delete order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("manage-shift:unhandled_error", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
