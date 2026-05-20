import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabase-admin';

type ReqLike = { headers?: { get: (name: string) => string | null } } | { headers?: Headers } | undefined;

function getHeader(req: ReqLike, name: string): string | null {
  if (!req || !req.headers) return null;
  // NextRequest.headers has .get, Node Headers also has .get
  // @ts-ignore
  if (typeof req.headers.get === 'function') return req.headers.get(name);
  try {
    const h = req.headers as Headers;
    return h.get(name);
  } catch {
    return null;
  }
}

export function getSupabaseForRequest(req?: ReqLike): SupabaseClient {
  // Prefer admin client when server service role is available
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getSupabaseAdmin();
  }

  // Look for per-request headers supplied by client vault
  const url = getHeader(req, 'x-supabase-url') || getHeader(req, 'x-supabase-url'.toLowerCase());
  const anon = getHeader(req, 'x-supabase-anon-key') || getHeader(req, 'x-supabase-anon-key'.toLowerCase());

  if (url && anon) {
    return createClient(url, anon);
  }

  // Fallback to environment public keys if present
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envUrl && envAnon) {
    return createClient(envUrl, envAnon);
  }

  throw new Error('Missing SUPABASE configuration on server. Provide SUPABASE_SERVICE_ROLE_KEY or send anon keys in request headers.');
}
