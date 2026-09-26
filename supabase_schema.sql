-- ==============================================================================
-- THARUUX-MD Platform Database Schema
-- Supabase PostgreSQL Schema with Row-Level Security (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,                     -- WhatsApp / Contact number
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT false,
  activation_start TIMESTAMPTZ,
  activation_end TIMESTAMPTZ,     -- Subscription expiry
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'business')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BOT INSTANCES TABLE (One instance per user)
CREATE TABLE IF NOT EXISTS public.bot_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bot_name TEXT DEFAULT 'THARUUX-MD',
  prefix TEXT DEFAULT '.',
  mode TEXT DEFAULT 'public' CHECK (mode IN ('public', 'private')),
  session_data JSONB,             -- Encrypted session credentials / creds
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'qr_ready')),
  qr_code TEXT,                   -- Current QR code string or data URL
  pairing_code TEXT,              -- 8-digit pairing code if requested
  whatsapp_number TEXT,
  whatsapp_name TEXT,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_bot UNIQUE (user_id)
);

-- 3. BOT CONFIGURATIONS TABLE (Detailed bot behavior settings)
CREATE TABLE IF NOT EXISTS public.bot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bot_instances(id) ON DELETE CASCADE,
  sticker_pack_name TEXT DEFAULT 'THARUUX-MD',
  sticker_author TEXT DEFAULT 'THARUUX🍀',
  alive_message TEXT DEFAULT '👋 Hey there! *THARUUX-MD* is active and running smooth.',
  alive_image_url TEXT,
  audio_title TEXT DEFAULT 'THARUUX-MD',
  audio_artist TEXT DEFAULT 'THARUUX',
  audio_thumbnail_url TEXT,
  bot_info TEXT DEFAULT 'THARUUX-MD - Next-Gen WhatsApp Automation Platform powered by ZYNEX Developments',
  auto_read BOOLEAN DEFAULT false,
  auto_react BOOLEAN DEFAULT false,
  auto_status_view BOOLEAN DEFAULT false,
  auto_call_reject BOOLEAN DEFAULT false,
  call_reject_message TEXT DEFAULT '📵 Sorry, voice/video calls are not supported by this bot.',
  start_message BOOLEAN DEFAULT true,
  error_message BOOLEAN DEFAULT true,
  sudo_numbers TEXT[] DEFAULT '{}',
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_bot_config UNIQUE (bot_id)
);

-- 4. CONTACT / BOT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  plan_interest TEXT DEFAULT 'basic' CHECK (plan_interest IN ('basic', 'premium', 'business', 'enterprise')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'approved', 'rejected', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for broadcast to all
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AUDIT LOG (Security tracking)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. GLOBAL BOT DEFAULTS (Admin configured defaults)
CREATE TABLE IF NOT EXISTS public.global_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_bot_instances_user_id ON public.bot_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_bot_id ON public.bot_configs(bot_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_configs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if requesting user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update own details" ON public.profiles;
CREATE POLICY "Users can update own details"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())); -- prevent privilege escalation

-- Bot Instances Policies
DROP POLICY IF EXISTS "Users can access own bot instance" ON public.bot_instances;
CREATE POLICY "Users can access own bot instance"
  ON public.bot_instances FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can access all bot instances" ON public.bot_instances;
CREATE POLICY "Admins can access all bot instances"
  ON public.bot_instances FOR ALL
  USING (public.is_admin());

-- Bot Configs Policies
DROP POLICY IF EXISTS "Users can manage own bot config" ON public.bot_configs;
CREATE POLICY "Users can manage own bot config"
  ON public.bot_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bot_instances
      WHERE bot_instances.id = bot_configs.bot_id
      AND bot_instances.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all bot configs" ON public.bot_configs;
CREATE POLICY "Admins can manage all bot configs"
  ON public.bot_configs FOR ALL
  USING (public.is_admin());

-- Contact Requests Policies
DROP POLICY IF EXISTS "Public can submit contact request" ON public.contact_requests;
CREATE POLICY "Public can submit contact request"
  ON public.contact_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage contact requests" ON public.contact_requests;
CREATE POLICY "Admins can manage contact requests"
  ON public.contact_requests FOR ALL
  USING (public.is_admin());

-- Notifications Policies
DROP POLICY IF EXISTS "Users can read their own or broadcast notifications" ON public.notifications;
CREATE POLICY "Users can read their own or broadcast notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update read status on their notifications" ON public.notifications;
CREATE POLICY "Users can update read status on their notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (public.is_admin());

-- Global Configs Policies
DROP POLICY IF EXISTS "Anyone can read global configs" ON public.global_configs;
CREATE POLICY "Anyone can read global configs"
  ON public.global_configs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage global configs" ON public.global_configs;
CREATE POLICY "Admins can manage global configs"
  ON public.global_configs FOR ALL
  USING (public.is_admin());

-- Audit Log Policies
DROP POLICY IF EXISTS "Admins can read audit log" ON public.audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "System can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_bot_instances_updated_at
  BEFORE UPDATE ON public.bot_instances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_bot_configs_updated_at
  BEFORE UPDATE ON public.bot_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
