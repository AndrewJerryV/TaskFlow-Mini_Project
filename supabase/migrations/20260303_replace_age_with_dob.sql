-- Replace age with dob in public.users
ALTER TABLE public.users 
DROP COLUMN IF EXISTS age,
ADD COLUMN IF NOT EXISTS dob DATE;

-- Recreate the admin_create_user_v2 RPC function to accept dob instead of age
CREATE OR REPLACE FUNCTION public.admin_create_user_v2(
  p_email text,
  p_password text,
  p_name text,
  p_user_role text,
  p_skills text[],
  p_max_workload integer,
  p_dob date DEFAULT NULL,
  p_skill_experience jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_caller_role text;
  v_encrypted_pw text;
BEGIN
  -- 1. Check if the caller is an Admin
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE id = auth.uid();

  IF v_caller_role != 'Admin' THEN
    RAISE EXCEPTION 'Only Administrators can create new users';
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- 2. Insert into auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, role, aud
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', p_email,
    v_encrypted_pw, now(), now(), now(),
    jsonb_build_object('name', p_name), 'authenticated', 'authenticated'
  );

  -- 3. Insert into auth.identities
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id::text, v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', now(), now(), now()
  );

  -- 4. Insert into public.users
  INSERT INTO public.users (
    id, email, name, role, skills, max_workload,
    wellness_score, created_at, dob, skill_experience
  ) VALUES (
    v_user_id, p_email, p_name, p_user_role, p_skills,
    p_max_workload, 85, now(), p_dob, p_skill_experience
  );

  RETURN v_user_id;
END;
$$;
