import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { TABLES } from "./list-tables";

function supabaseForUser(ctx: ToolContext) {
  const env = (globalThis as any).process?.env ?? {};
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "select_rows",
  title: "Read rows from a table",
  description:
    "Read rows from a Boulevard Café public table. Respects RLS as the signed-in user. Use `list_tables` first to see valid names.",
  inputSchema: {
    table: z.enum(TABLES as unknown as [string, ...string[]]).describe("Table name"),
    columns: z.string().optional().describe("Comma-separated columns, or '*' for all. Default '*'."),
    limit: z.number().int().min(1).max(200).optional().describe("Row limit (max 200). Default 50."),
    orderBy: z.string().optional().describe("Column to order by."),
    ascending: z.boolean().optional().describe("Ascending order. Default false (newest first when using created_at)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ table, columns, limit, orderBy, ascending }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb.from(table).select(columns || "*").limit(limit ?? 50);
    if (orderBy) q = q.order(orderBy, { ascending: ascending ?? false });
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { rows: data ?? [], count: data?.length ?? 0 },
    };
  },
});