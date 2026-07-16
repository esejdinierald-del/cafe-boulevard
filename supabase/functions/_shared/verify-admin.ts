import { sha256, timingSafeEqualHex } from "./hash.ts";

// Verify a specific staff member's personal admin password via bcrypt RPC.
// Replaces the previous shared "admin_passcode" model.
export async function verifyStaffAdmin(
  supabase: any,
  params: { staffId?: unknown; staffName?: unknown; password?: unknown },
): Promise<{ ok: true; admin: { id: string; name: string; role: string } } | { ok: false; status: number; error: string }> {
  const password = typeof params.password === "string" ? params.password : "";
  if (!password) {
    return { ok: false, status: 400, error: "Mungon fjalëkalimi" };
  }
  const staffId = typeof params.staffId === "string" ? params.staffId.trim() : "";
  const staffName = typeof params.staffName === "string" ? params.staffName.trim() : "";
  // Primary: per-staff admin password (bcrypt via SECURITY DEFINER RPC).
  if (staffId && /^[0-9a-f-]{36}$/i.test(staffId)) {
    const { data, error } = await supabase.rpc("verify_staff_admin_password", {
      p_staff_id: staffId,
      p_password: password,
    });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return { ok: true, admin: row as { id: string; name: string; role: string } };
    }
  }
  // Alt lookup by staff name (for panels where the admin isn't logged in as staff on this device).
  if (staffName) {
    const { data, error } = await supabase.rpc("verify_staff_admin_password_by_name", {
      p_name: staffName,
      p_password: password,
    });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return { ok: true, admin: row as { id: string; name: string; role: string } };
    }
  }
  // Fallback (transitional): shared admin_passcode until every admin has set a personal password.
  const { data: setting } = await supabase
    .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
  const expectedHash = setting?.value;
  if (expectedHash) {
    const providedHash = await sha256(String(password));
    if (timingSafeEqualHex(providedHash, String(expectedHash))) {
      return { ok: true, admin: { id: "", name: "Admin", role: "admin" } };
    }
  }
  return { ok: false, status: 403, error: "Fjalëkalim i pasaktë ose nuk je admin" };
}