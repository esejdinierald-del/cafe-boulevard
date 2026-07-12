// Inventory tables now live in the same backend as the POS/menu/staff data.
// Keep this named export so existing inventory code does not need to change.
export { supabase as inventorySupabase } from "./client";