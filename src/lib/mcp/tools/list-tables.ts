import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const TABLES = [
  "menu_items", "categories", "tables", "pos_orders", "transactions",
  "raw_materials", "recipes", "supplies", "inv_products", "inv_daily_entries",
  "inv_next_day_stock", "shift_turns", "staff_members", "user_roles",
  "supplier_orders", "product_costs", "fiscal_receipts", "audit_log",
  "app_logs", "feedback", "print_jobs", "orders", "order_items_split",
  "service_requests", "song_requests", "chat_sessions", "ai_knowledge",
  "app_settings",
] as const;

export default defineTool({
  name: "list_tables",
  title: "List database tables",
  description: "List all public tables available in the Boulevard Café database.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(TABLES, null, 2) }],
    structuredContent: { tables: TABLES },
  }),
});

export { TABLES };