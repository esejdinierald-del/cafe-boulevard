-- Refresh database types
-- Add comments to trigger type regeneration

COMMENT ON TABLE public.service_requests IS 'Customer service requests for waiter or bill';
COMMENT ON TABLE public.orders IS 'Customer food and beverage orders';
COMMENT ON TABLE public.categories IS 'Menu item categories';
COMMENT ON TABLE public.menu_items IS 'Restaurant menu items';
COMMENT ON TABLE public.user_roles IS 'User role assignments';