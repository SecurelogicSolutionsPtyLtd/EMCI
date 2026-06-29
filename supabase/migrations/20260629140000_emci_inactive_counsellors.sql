-- Portal-managed inactive counsellor overrides (Dataverse systemuser GUID).
-- Used when a counsellor should be treated as inactive in KPIs and Counsellor View
-- without requiring Dataverse isdisabled or a platform team account.

CREATE TABLE IF NOT EXISTS public.emci_inactive_counsellors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataverse_owner_id  text NOT NULL,
  display_name        text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT emci_inactive_counsellors_owner_id_key UNIQUE (dataverse_owner_id),
  CONSTRAINT emci_inactive_counsellors_owner_id_lower_chk CHECK (dataverse_owner_id = lower(dataverse_owner_id))
);

CREATE INDEX IF NOT EXISTS emci_inactive_counsellors_owner_id_idx
  ON public.emci_inactive_counsellors (dataverse_owner_id);

ALTER TABLE public.emci_inactive_counsellors ENABLE ROW LEVEL SECURITY;

-- ACCE staff need read access for counsellor KPIs and Counsellor View.
DROP POLICY IF EXISTS acce_read_inactive_counsellors ON public.emci_inactive_counsellors;
CREATE POLICY acce_read_inactive_counsellors ON public.emci_inactive_counsellors
  FOR SELECT TO authenticated
  USING (emci_get_my_role() IN ('acce_staff', 'acce_admin', 'securelogic_admin'));

-- Platform admins may manage overrides; SecureLogic Admin retains full control.
DROP POLICY IF EXISTS platform_admin_write_inactive_counsellors ON public.emci_inactive_counsellors;
CREATE POLICY platform_admin_write_inactive_counsellors ON public.emci_inactive_counsellors
  FOR ALL TO authenticated
  USING (emci_is_platform_admin())
  WITH CHECK (emci_is_platform_admin());

GRANT SELECT ON public.emci_inactive_counsellors TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.emci_inactive_counsellors TO authenticated;

-- Patricia Crilly — inactive counsellor override (Dataverse systemuser GUID).
INSERT INTO public.emci_inactive_counsellors (dataverse_owner_id, display_name, notes)
VALUES (
  '13684b43-6127-ee11-9965-0022489334a7',
  'Patricia Crilly',
  'Portal inactive override'
)
ON CONFLICT (dataverse_owner_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  notes = EXCLUDED.notes;
