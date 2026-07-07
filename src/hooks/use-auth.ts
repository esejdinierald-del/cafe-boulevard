import { useEffect, useState } from "react";

export function useAuth() {
  const [shiftToken, setShiftToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      setShiftToken(localStorage.getItem("staff_shift_token"));
    } catch {
      setShiftToken(null);
    }
  }, []);
  return { shiftToken };
}