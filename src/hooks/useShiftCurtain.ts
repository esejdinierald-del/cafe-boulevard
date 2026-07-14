import { useEffect, useState } from "react";
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

  const ensureShiftToken = async () => {
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
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: {
          action: "get_or_create",
          shift_start: shiftStart.toISOString(),
          shift_end: shiftEnd.toISOString(),
        },
      });
      if (error || !data?.token) {
        console.error("Failed to get shift token:", error);
        return null;
      }
      setShiftToken(data.token);
      setStaffUrl(`${window.location.origin}/staff?token=${data.token}`);
      if (data.unlocked) setCurtainActive(false);
      return data.token as string;
    } catch (e) {
      console.error("Failed to get shift token:", e);
      return null;
    }
  };

  useEffect(() => {
    ensureShiftToken();
  }, []);

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

  return { curtainActive, setCurtainActive, shiftToken, staffUrl };
}