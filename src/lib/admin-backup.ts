import { adminRead } from "@/lib/staff-read";

export async function buildBackupJson(passcode: string): Promise<string> {
  const { data, error } = await adminRead<Record<string, unknown>>("backup.snapshot", passcode);
  if (error) throw new Error(error);
  const snapshot: Record<string, unknown> = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: 1,
      note: "Backup i konfigurimit — vetëm lexim. Për restaurim, kërko admin manual.",
    },
    ...(data || {}),
  };
  return JSON.stringify(snapshot, null, 2);
}

export function downloadBackup(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `boulevard-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}