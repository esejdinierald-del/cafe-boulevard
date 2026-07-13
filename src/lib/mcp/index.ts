import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTablesTool from "./tools/list-tables";
import selectRowsTool from "./tools/select-rows";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "boulevard-cafe-mcp",
  title: "Boulevard Café MCP",
  version: "0.1.0",
  instructions:
    "Read-only access to the Boulevard Café database (Lovable Cloud). Use `list_tables` to see what's available, then `select_rows` to fetch data. All access is scoped to the signed-in manager's RLS permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTablesTool, selectRowsTool],
});