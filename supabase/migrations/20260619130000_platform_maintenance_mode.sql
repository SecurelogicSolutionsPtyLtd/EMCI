-- Platform maintenance mode — readable by all (login banner), writable by acce_admin only.

CREATE TABLE IF NOT EXISTS public.emci_platform_settings (
  id integer NOT NULL DEFAULT 1,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT emci_platform_settings_pkey PRIMARY KEY (id),
  CONSTRAINT emci_platform_settings_id_check CHECK (id = 1)
);

INSERT INTO public.emci_platform_settings (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS emci_platform_settings_updated_at ON public.emci_platform_settings;
CREATE TRIGGER emci_platform_settings_updated_at
  BEFORE UPDATE ON public.emci_platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.emci_set_updated_at();

ALTER TABLE public.emci_platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_read ON public.emci_platform_settings;
CREATE POLICY platform_settings_read ON public.emci_platform_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS platform_settings_update ON public.emci_platform_settings;
CREATE POLICY platform_settings_update ON public.emci_platform_settings
  FOR UPDATE TO authenticated
  USING (emci_get_my_role() = 'acce_admin')
  WITH CHECK (emci_get_my_role() = 'acce_admin');

GRANT SELECT ON public.emci_platform_settings TO anon, authenticated;
GRANT UPDATE (maintenance_mode, maintenance_message, updated_by) ON public.emci_platform_settings TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.emci_platform_settings;
