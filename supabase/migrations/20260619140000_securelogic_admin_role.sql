-- SecureLogic Admin super-admin role — mirrors acce_admin platform permissions.
-- Maintenance bypass is app-layer (securelogic_admin only); both platform admins may toggle maintenance.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'emci_role' AND e.enumlabel = 'securelogic_admin'
  ) THEN
    ALTER TYPE public.emci_role ADD VALUE 'securelogic_admin';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.emci_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT emci_get_my_role() IN ('acce_admin', 'securelogic_admin');
$$;

GRANT EXECUTE ON FUNCTION public.emci_is_platform_admin() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS acce_admin_all ON public.emci_user_roles;
DROP POLICY IF EXISTS platform_admin_all ON public.emci_user_roles;
CREATE POLICY platform_admin_all ON public.emci_user_roles
  FOR ALL TO authenticated
  USING (emci_is_platform_admin())
  WITH CHECK (emci_is_platform_admin());

DROP POLICY IF EXISTS platform_settings_update ON public.emci_platform_settings;
CREATE POLICY platform_settings_update ON public.emci_platform_settings
  FOR UPDATE TO authenticated
  USING (emci_is_platform_admin())
  WITH CHECK (emci_is_platform_admin());
