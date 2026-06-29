-- Patricia Crilly has two Dataverse systemuser records; students are owned by the active duplicate.
INSERT INTO public.emci_inactive_counsellors (dataverse_owner_id, display_name, notes)
VALUES (
  '7cbb0112-034e-ef11-a316-6045bde53c6c',
  'Patricia Crilly',
  'Student-assigned owner GUID (active duplicate)'
)
ON CONFLICT (dataverse_owner_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  notes = EXCLUDED.notes;
