import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Manages the QR "curtain" gate on the Dashboard: gets/creates the current
 * shift token via the `manage-shift` edge function and polls for unlock.
 */
export function useShiftCurtain() {
  const [curtainActive, setCurtainActive] = useState(true);
  const [shiftToken, setShiftToken] = useState<string | null>(null);
  const [staffUrl, setStaffUrl] = useState<string>("");
  const [needsQr, setNeedsQr] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  // Read (and immediately strip) the `?qr=<secret>` param, if any.
  const readAndStripQrParam = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const url = new URL(window.location.href);
      const qr = url.searchParams.get("qr");
      if (!qr) return null;
      url.searchParams.delete("qr");
      window.history.replaceState({}, "", url.toString());
      return qr;
    } catch {
      return null;
    }
  }, []);

  const ensureShiftToken = useCallback(async (qrOverride?: string | null) => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;

    // Prefer an explicit qrSecret (from URL) over any stored token. Without a
    // qrSecret we do NOT clear an existing token — legitimate shifts already
    // in progress must keep working across page reloads.
    const qrSecret = qrOverride ?? readAndStripQrParam();
    let storedToken: string | null = null;
    try { storedToken = localStorage.getItem("staff_shift_token"); } catch {}

    // No qrSecret AND no stored token → don't create anything. Show curtain
    // asking the operator to scan the venue QR.
    if (!qrSecret && !storedToken) {
      setNeedsQr(true);
      setCurtainActive(true);
      inFlightRef.current = false;
      return null;
    }

    // No qrSecret but we DO have a stored token → trust it, let check_unlock
    // poll validate. This preserves already-active shifts.
    if (!qrSecret && storedToken) {
      setShiftToken(storedToken);
      setStaffUrl(`${window.location.origin}/staff?token=${storedToken}`);
      setNeedsQr(false);
      inFlightRef.current = false;
      return storedToken;
    }

    // qrSecret present → (re)mint via server. Clear stale token first so we
    // don't accidentally reuse an expired one.
    try { localStorage.removeItem("staff_shift_token"); } catch {}
    setShiftToken(null);
    const now = new Date();
    const hour = now.getHours();
    let shiftStart: Date;
    let shiftEnd: Date;

    if (hour >= 3 && hour < 15) {
      shiftStart = new Date(now); shiftStart.setHours(3, 0, 0, 0);
      shiftEnd = new Date(now); shiftEnd.setHours(15, 0, 0, 0);
    } else {
      shiftStart = new Date(now);
      if (hour >= 15) {
        shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(now); shiftEnd.setDate(shiftEnd.getDate() + 1); shiftEnd.setHours(3, 0, 0, 0);
      } else {
        shiftStart.setDate(shiftStart.getDate() - 1); shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(now); shiftEnd.setHours(3, 0, 0, 0);
      }
    }

    try {
      const result = await Promise.race([
        supabase.functions.invoke("manage-shift", {
          body: {
            action: "get_or_create",
            shift_start: shiftStart.toISOString(),
            shift_end: shiftEnd.toISOString(),
            qrSecret,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("manage-shift get_or_create timeout")), 12000)
        ),
      ]);

      const { data, error } = result;
      if (data?.needsQr) {
        setNeedsQr(true);
        setCurtainActive(true);
        return null;
      }
      if (error || !data?.token) {
        console.error("Failed to get shift token:", error);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => { void ensureShiftToken(); }, 5000);
        return null;
      }
      setNeedsQr(false);
      setShiftToken(data.token);
      try { localStorage.setItem("staff_shift_token", data.token); } catch {}
      setStaffUrl(`${window.location.origin}/staff?token=${data.token}`);
      if (data.unlocked) setCurtainActive(false);
      return data.token as string;
    } catch (e) {
      console.error("Failed to get shift token:", e);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => { void ensureShiftToken(); }, 5000);
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [readAndStripQrParam]);

  useEffect(() => {
    void ensureShiftToken();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [ensureShiftToken]);

  // Poll for unlock while curtain is active
  useEffect(() => {
    if (!curtainActive || !shiftToken) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("manage-shift", {
          body: { action: "check_unlock", token: shiftToken },
        });
        if (data?.unlocked) {
          setCurtainActive(false);
          toast.success("🔓 Turni u aktivizua!");
        }
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(poll);
  }, [curtainActive, shiftToken]);

  return { curtainActive, setCurtainActive, shiftToken, staffUrl, ensureShiftToken, needsQr };
}