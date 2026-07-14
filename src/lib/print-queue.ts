import { staffRead } from "@/lib/staff-read";

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
  const { data, error } = await staffRead<{ id: string }>("print_jobs.enqueue", {
    station: input.station || "arka",
    kind: input.kind,
    title: input.title || "Boulevard Cafe",
    receiptText: input.receiptText,
    createdBy: creator,
    tableCode: input.tableCode ?? null,
    amount: input.amount ?? null,
  });
  if (error || !data?.id) {
    console.error("[print-queue] enqueue failed", error);
    return null;
  }
  return data.id;
};

export const countPendingForMe = async (): Promise<number> => {
  const me = localStorage.getItem("staff_name") || "Kamarier";
  const { data, error } = await staffRead<{ count: number }>("print_jobs.count_pending", {
    createdBy: me,
  });
  if (error || !data) return 0;
  return data.count || 0;
};