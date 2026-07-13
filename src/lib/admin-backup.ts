import { supabase } from "@/integrations/supabase/client";

const READ_TABLES = [
  "categories",
  "menu_items",
  "tables",
  "staff_members",
  "raw_materials",
  "recipes",
  "inv_products",
  "app_settings",
  "ai_knowledge",
] as const;

export async function buildBackupJson(): Promise<string> {
  const snapshot: Record<string, unknown> = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: 1,
      note: "Backup i konfigurimit — vetëm lexim. Për restaurim, kërko admin manual.",
    },
  };
  for (const t of READ_TABLES) {
    try {
      const { data, error } = await supabase.from(t as any).select("*");
      snapshot[t] = error ? { error: error.message } : data;
    } catch (e) {
      snapshot[t] = { error: (e as Error).message };
    }
  }
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