import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getRequiredServerEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';

  if (!supabaseUrl) {
    throw new Error(
      'Missing required server environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing required server environment variable: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(
    supabaseUrl || getRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey
  );
}
