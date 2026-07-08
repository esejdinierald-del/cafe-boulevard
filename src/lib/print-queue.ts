import { supabase } from "@/integrations/supabase/client";

export type PrintJobKind = "close_table" | "order" | "kitchen" | "bar" | "manual";
export type PrintStation = "arka" | "kuzhina" | "bar";

export interface QueueJobInput {
  receiptText: string;
  title?: string;
  kind: PrintJobKind;
  station?: PrintStation;
  createdBy?: string;
  tableCode?: string | number | null;
  amount?: number | null;
}

/**
 * Enqueue a receipt for printing on the physical printer station
 * (the PC that has /print-station open in kiosk-printing mode).
 * Returns the created job id, or null on error.
 */
export const queuePrintJob = async (input: QueueJobInput): Promise<string | null> => {
  const creator = input.createdBy || localStorage.getItem("staff_name") || "Kamarier";
  const { data, error } = await supabase
    .from("print_jobs")
    .insert({
      station: input.station || "arka",
      kind: input.kind,
      title: input.title || "Bileta",
      receipt_text: input.receiptText,
      created_by: creator,
      table_code: input.tableCode == null ? null : String(input.tableCode),
      amount: input.amount ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[print-queue] enqueue failed", error);
    return null;
  }
  return (data as { id: string }).id;
};

export const countPendingForMe = async (): Promise<number> => {
  const me = localStorage.getItem("staff_name") || "Kamarier";
  const { count } = await supabase
    .from("print_jobs")
    .select("id", { count: "exact", head: true })
    .eq("created_by", me)
    .eq("status", "pending");
  return count || 0;
};