-- Fix admin_create_user_v2 to use public.users instead of public.profiles
-- Run this in the Supabase SQL editor if you see: relation "public.profiles" does not exist

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
SET search_path = public, auth, extensions
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
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- 2. Insert into auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', p_email,
    v_encrypted_pw, now(), now(), now(),
    jsonb_build_object('name', p_name), 'authenticated', 'authenticated',
    '', '', '', ''
  );

  -- 3. Insert into auth.identities
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id::text, v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', now(), now(), now()
  );

  -- 4. Insert into public.users (idempotent)
  INSERT INTO public.users (
    id, email, name, role, skills, max_workload,
    wellness_score, created_at, dob, skill_experience
  ) VALUES (
    v_user_id, p_email, p_name, p_user_role, p_skills,
    p_max_workload, 85, now(), p_dob, p_skill_experience
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = EXCLUDED.role,
    skills = EXCLUDED.skills,
    max_workload = EXCLUDED.max_workload,
    wellness_score = EXCLUDED.wellness_score,
    dob = EXCLUDED.dob,
    skill_experience = EXCLUDED.skill_experience;

  RETURN v_user_id;
END;
$$;

-- Helper: expose the function definition for quick verification
CREATE OR REPLACE FUNCTION public.get_admin_create_user_v2_definition()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_get_functiondef('public.admin_create_user_v2(text,text,text,text,text[],integer,date,jsonb)'::regprocedure);
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_create_user_v2_definition() TO public;
