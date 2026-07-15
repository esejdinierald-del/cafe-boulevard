// Verify a specific staff member's personal admin password via bcrypt RPC.
// Replaces the previous shared "admin_passcode" model.
export async function verifyStaffAdmin(
  supabase: any,
  params: { staffId?: unknown; password?: unknown },
): Promise<{ ok: true; admin: { id: string; name: string; role: string } } | { ok: false; status: number; error: string }> {
  const staffId = typeof params.staffId === "string" ? params.staffId.trim() : "";
  const password = typeof params.password === "string" ? params.password : "";
  if (!staffId || !/^[0-9a-f-]{36}$/i.test(staffId)) {
    return { ok: false, status: 400, error: "Mungon identifikimi i stafit" };
  }
  if (!password) {
    return { ok: false, status: 400, error: "Mungon fjalëkalimi" };
  }
  const { data, error } = await supabase.rpc("verify_staff_admin_password", {
    p_staff_id: staffId,
    p_password: password,
  });
  if (error) return { ok: false, status: 500, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, status: 403, error: "Fjalëkalim i pasaktë ose nuk je admin" };
  return { ok: true, admin: row as { id: string; name: string; role: string } };
}