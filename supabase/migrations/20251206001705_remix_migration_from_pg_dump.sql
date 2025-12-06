CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'user'
);


--
-- Name: handle_manager_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_manager_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if the new user's email is one of the manager emails
  IF NEW.email IN ('menuonline483@gmail.com', 'sejdinierald@gmail.com') THEN
    -- Insert manager role for this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    name_en text
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    image_url text,
    available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    name_en text,
    description_en text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    table_number text NOT NULL,
    items jsonb NOT NULL,
    total_price integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text
);


--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_number text NOT NULL,
    request_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT service_requests_request_type_check CHECK ((request_type = ANY (ARRAY['waiter'::text, 'bill'::text]))),
    CONSTRAINT service_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY public.service_requests REPLICA IDENTITY FULL;


--
-- Name: table_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_number text NOT NULL,
    device_id text NOT NULL,
    device_name text,
    device_type text DEFAULT 'heater'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: table_devices table_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_devices
    ADD CONSTRAINT table_devices_pkey PRIMARY KEY (id);


--
-- Name: table_devices table_devices_table_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_devices
    ADD CONSTRAINT table_devices_table_number_key UNIQUE (table_number);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_service_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_requests_created_at ON public.service_requests USING btree (created_at DESC);


--
-- Name: idx_service_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_requests_status ON public.service_requests USING btree (status);


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: orders Anyone can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);


--
-- Name: service_requests Anyone can create service requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create service requests" ON public.service_requests FOR INSERT TO anon WITH CHECK (true);


--
-- Name: orders Anyone can delete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete orders" ON public.orders FOR DELETE USING (true);


--
-- Name: service_requests Anyone can delete service requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete service requests" ON public.service_requests FOR DELETE TO anon USING (true);


--
-- Name: orders Anyone can update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);


--
-- Name: service_requests Anyone can update service requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update service requests" ON public.service_requests FOR UPDATE TO anon USING (true);


--
-- Name: categories Anyone can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);


--
-- Name: menu_items Anyone can view menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (true);


--
-- Name: orders Anyone can view orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT USING (true);


--
-- Name: service_requests Anyone can view service requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view service requests" ON public.service_requests FOR SELECT TO anon USING (true);


--
-- Name: table_devices Anyone can view table devices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view table devices" ON public.table_devices FOR SELECT USING (true);


--
-- Name: categories Managers can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete categories" ON public.categories FOR DELETE USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: menu_items Managers can delete menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete menu items" ON public.menu_items FOR DELETE USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: table_devices Managers can delete table devices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete table devices" ON public.table_devices FOR DELETE USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: categories Managers can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert categories" ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: menu_items Managers can insert menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: table_devices Managers can insert table devices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert table devices" ON public.table_devices FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: categories Managers can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update categories" ON public.categories FOR UPDATE USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: menu_items Managers can update menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update menu items" ON public.menu_items FOR UPDATE USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: table_devices Managers can update table devices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update table devices" ON public.table_devices FOR UPDATE USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: user_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: service_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: table_devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.table_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


