-- EMCI schema bootstrap (matches legacy project yfvvroesornchrxufwut).
-- Apply to the Australia prod project (vklwppadgogepkeaizow) before data import.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emci_role') THEN
    CREATE TYPE public.emci_role AS ENUM (
      'acce_admin',
      'acce_staff',
      'school_admin',
      'school_staff',
      'de_admin',
      'de_staff'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public._analysis_key_store (
  id integer NOT NULL DEFAULT 1,
  key_val text NOT NULL,
  CONSTRAINT _analysis_key_store_pkey PRIMARY KEY (id),
  CONSTRAINT _analysis_key_store_id_check CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS public.emci_user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  display_name text,
  role public.emci_role NOT NULL,
  school_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  counsellor_email text,
  dataverse_owner_id text,
  CONSTRAINT emci_user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT emci_user_roles_email_key UNIQUE (email),
  CONSTRAINT emci_user_roles_user_id_key UNIQUE (user_id),
  CONSTRAINT emci_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT emci_user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS emci_user_roles_email_idx ON public.emci_user_roles (email);
CREATE INDEX IF NOT EXISTS emci_user_roles_role_idx ON public.emci_user_roles (role);
CREATE INDEX IF NOT EXISTS emci_user_roles_user_id_idx ON public.emci_user_roles (user_id);

CREATE TABLE IF NOT EXISTS public.student_analysis (
  student_id text NOT NULL,
  school_id text,
  analysis text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  source_hash text,
  sentiment text,
  sentiment_source_hash text,
  sentiment_generated_at timestamptz,
  rating text,
  rating_source_hash text,
  rating_generated_at timestamptz,
  CONSTRAINT student_analysis_pkey PRIMARY KEY (student_id)
);

CREATE OR REPLACE FUNCTION public.emci_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emci_user_roles_updated_at ON public.emci_user_roles;
CREATE TRIGGER emci_user_roles_updated_at
  BEFORE UPDATE ON public.emci_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.emci_set_updated_at();

CREATE OR REPLACE FUNCTION public.emci_get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.emci_user_roles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.emci_get_my_school_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT school_id FROM public.emci_user_roles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.emci_resolve_user_role(p_user_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT role::text, school_id, display_name, email,
         counsellor_email, dataverse_owner_id
  INTO v_row
  FROM public.emci_user_roles
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'role', v_row.role,
      'school_id', v_row.school_id,
      'display_name', v_row.display_name,
      'email', v_row.email,
      'counsellor_email', v_row.counsellor_email,
      'dataverse_owner_id', v_row.dataverse_owner_id
    );
  END IF;

  UPDATE public.emci_user_roles
  SET user_id = p_user_id
  WHERE lower(email) = lower(p_email)
    AND user_id IS NULL
    AND is_active = true
  RETURNING role::text, school_id, display_name, email,
            counsellor_email, dataverse_owner_id
  INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'role', v_row.role,
      'school_id', v_row.school_id,
      'display_name', v_row.display_name,
      'email', v_row.email,
      'counsellor_email', v_row.counsellor_email,
      'dataverse_owner_id', v_row.dataverse_owner_id
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_analysis(p_student_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  enc_val text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;
  SELECT analysis INTO enc_val FROM public.student_analysis WHERE student_id = p_student_id;
  IF enc_val IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(decode(enc_val, 'base64'), enc_key)::text;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_analysis_record(p_student_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  enc_val text;
  gen_at timestamptz;
  src_hash text;
  plain_text text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;
  SELECT analysis, generated_at, source_hash
    INTO enc_val, gen_at, src_hash
    FROM public.student_analysis
   WHERE student_id = p_student_id;

  IF enc_val IS NULL THEN RETURN NULL; END IF;

  plain_text := pgp_sym_decrypt(decode(enc_val, 'base64'), enc_key)::text;

  RETURN json_build_object(
    'analysis', plain_text,
    'generated_at', gen_at,
    'source_hash', src_hash
  );
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_sentiment_record(p_student_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  enc_val text;
  gen_at timestamptz;
  src_hash text;
  plain_text text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;

  SELECT sentiment, sentiment_generated_at, sentiment_source_hash
    INTO enc_val, gen_at, src_hash
    FROM public.student_analysis
   WHERE student_id = p_student_id;

  IF enc_val IS NULL THEN RETURN NULL; END IF;

  plain_text := pgp_sym_decrypt(decode(enc_val, 'base64'), enc_key)::text;

  RETURN json_build_object(
    'sentiment', plain_text,
    'generated_at', gen_at,
    'source_hash', src_hash
  );
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_rating_record(p_student_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  enc_val text;
  gen_at timestamptz;
  src_hash text;
  plain_text text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;

  SELECT rating, rating_generated_at, rating_source_hash
    INTO enc_val, gen_at, src_hash
    FROM public.student_analysis
   WHERE student_id = p_student_id;

  IF enc_val IS NULL THEN RETURN NULL; END IF;

  plain_text := pgp_sym_decrypt(decode(enc_val, 'base64'), enc_key)::text;

  RETURN json_build_object(
    'rating', plain_text,
    'generated_at', gen_at,
    'source_hash', src_hash
  );
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

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
        'overall', (pgp_sym_decrypt(decode(sa.rating, 'base64'), enc_key)::json->>'overall')::int
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

CREATE OR REPLACE FUNCTION public.upsert_student_analysis(
  p_student_id text,
  p_school_id text,
  p_analysis text,
  p_source_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;
  INSERT INTO public.student_analysis (student_id, school_id, analysis, generated_at, source_hash)
  VALUES (
    p_student_id,
    p_school_id,
    encode(pgp_sym_encrypt(p_analysis, enc_key), 'base64'),
    now(),
    p_source_hash
  )
  ON CONFLICT (student_id) DO UPDATE SET
    school_id = excluded.school_id,
    analysis = excluded.analysis,
    generated_at = excluded.generated_at,
    source_hash = excluded.source_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_student_sentiment(
  p_student_id text,
  p_school_id text,
  p_sentiment text,
  p_source_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  enc_sentiment text;
  enc_empty text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;

  enc_sentiment := encode(pgp_sym_encrypt(p_sentiment, enc_key), 'base64');
  enc_empty := encode(pgp_sym_encrypt('{}', enc_key), 'base64');

  INSERT INTO public.student_analysis (
    student_id, school_id, analysis, sentiment,
    sentiment_generated_at, sentiment_source_hash
  )
  VALUES (
    p_student_id, p_school_id, enc_empty, enc_sentiment, now(), p_source_hash
  )
  ON CONFLICT (student_id) DO UPDATE SET
    school_id = COALESCE(excluded.school_id, student_analysis.school_id),
    sentiment = excluded.sentiment,
    sentiment_generated_at = excluded.sentiment_generated_at,
    sentiment_source_hash = excluded.sentiment_source_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_student_rating(
  p_student_id text,
  p_school_id text,
  p_rating text,
  p_source_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
  enc_rating text;
  enc_empty text;
BEGIN
  SELECT key_val INTO enc_key FROM public._analysis_key_store WHERE id = 1;

  enc_rating := encode(pgp_sym_encrypt(p_rating, enc_key), 'base64');
  enc_empty := encode(pgp_sym_encrypt('{}', enc_key), 'base64');

  INSERT INTO public.student_analysis (
    student_id, school_id, analysis, rating,
    rating_generated_at, rating_source_hash
  )
  VALUES (
    p_student_id, p_school_id, enc_empty, enc_rating, now(), p_source_hash
  )
  ON CONFLICT (student_id) DO UPDATE SET
    school_id = COALESCE(excluded.school_id, student_analysis.school_id),
    rating = excluded.rating,
    rating_generated_at = excluded.rating_generated_at,
    rating_source_hash = excluded.rating_source_hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emci_get_my_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emci_get_my_school_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emci_resolve_user_role(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emci_set_updated_at() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_analysis(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_analysis_record(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_sentiment_record(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_rating_record(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_student_rating_scores(text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_student_analysis(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_student_sentiment(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_student_rating(text, text, text, text) TO anon, authenticated, service_role;

ALTER TABLE public.emci_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._analysis_key_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acce_admin_all ON public.emci_user_roles;
CREATE POLICY acce_admin_all ON public.emci_user_roles
  FOR ALL USING (emci_get_my_role() = 'acce_admin')
  WITH CHECK (emci_get_my_role() = 'acce_admin');

DROP POLICY IF EXISTS acce_staff_read ON public.emci_user_roles;
CREATE POLICY acce_staff_read ON public.emci_user_roles
  FOR SELECT USING (emci_get_my_role() = 'acce_staff');

DROP POLICY IF EXISTS de_admin_read_de_users ON public.emci_user_roles;
CREATE POLICY de_admin_read_de_users ON public.emci_user_roles
  FOR SELECT USING (
    emci_get_my_role() = 'de_admin'
    AND role = ANY (ARRAY['de_admin'::public.emci_role, 'de_staff'::public.emci_role])
  );

DROP POLICY IF EXISTS de_admin_write_de_users ON public.emci_user_roles;
CREATE POLICY de_admin_write_de_users ON public.emci_user_roles
  FOR UPDATE USING (
    emci_get_my_role() = 'de_admin'
    AND role = ANY (ARRAY['de_admin'::public.emci_role, 'de_staff'::public.emci_role])
  );

DROP POLICY IF EXISTS de_staff_read_de_users ON public.emci_user_roles;
CREATE POLICY de_staff_read_de_users ON public.emci_user_roles
  FOR SELECT USING (
    emci_get_my_role() = 'de_staff'
    AND role = ANY (ARRAY['de_admin'::public.emci_role, 'de_staff'::public.emci_role])
  );

DROP POLICY IF EXISTS own_record_read ON public.emci_user_roles;
CREATE POLICY own_record_read ON public.emci_user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS school_admin_read_own_school ON public.emci_user_roles;
CREATE POLICY school_admin_read_own_school ON public.emci_user_roles
  FOR SELECT USING (
    emci_get_my_role() = 'school_admin'
    AND school_id = emci_get_my_school_id()
  );

DROP POLICY IF EXISTS school_staff_read_own_school ON public.emci_user_roles;
CREATE POLICY school_staff_read_own_school ON public.emci_user_roles
  FOR SELECT USING (
    emci_get_my_role() = 'school_staff'
    AND school_id = emci_get_my_school_id()
  );

DROP POLICY IF EXISTS "service role full access" ON public.student_analysis;
CREATE POLICY "service role full access" ON public.student_analysis
  FOR ALL USING (true) WITH CHECK (true);
