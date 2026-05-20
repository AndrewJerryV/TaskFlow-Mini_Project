import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

export async function GET() {
  try {
  const { data, error } = await getSupabaseAdmin().rpc('get_admin_create_user_v2_definition');

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const definition = typeof data === 'string' ? data : '';
    const usesUsersTable = definition.includes('public.users');

    return NextResponse.json({
      ok: true,
      rpc: 'admin_create_user_v2',
      usesUsersTable,
      hasDefinition: definition.length > 0,
      definitionSnippet: definition.slice(0, 240)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
