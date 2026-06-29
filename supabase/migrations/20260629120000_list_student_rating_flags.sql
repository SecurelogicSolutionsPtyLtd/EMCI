-- Extend bulk rating fetch to include AI flags for priority-alert surfacing (P6-T3).

CREATE OR REPLACE FUNCTION public.list_student_rating_scores(p_student_ids text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  result json;
BEGIN
  IF p_student_ids IS NULL OR array_length(p_student_ids, 1) IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'student_id', sa.student_id,
        'overall', (pgp_sym_decrypt(decode(sa.rating, 'base64'), enc_key)::json->>'overall')::int,
        'flags', pgp_sym_decrypt(decode(sa.rating, 'base64'), enc_key)::json->'flags'
      )
    ),
    '[]'::json
  )
  INTO result
  FROM public.student_analysis sa
  WHERE sa.student_id = ANY(p_student_ids)
    AND sa.rating IS NOT NULL;

  RETURN result;
EXCEPTION WHEN others THEN
  RETURN '[]'::json;
END;
$$;
