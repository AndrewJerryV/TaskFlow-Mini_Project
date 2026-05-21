import { NextResponse } from 'next/server';

function getProjectRef(supabaseUrl: string) {
  try {
    const host = new URL(supabaseUrl).hostname;
    const [ref, ...rest] = host.split('.');
    if (!ref || rest.join('.') !== 'supabase.co') {
      return null;
    }
    return ref;
  } catch {
    return null;
  }
}

function escapeSqlLiteral(value: string) {
  return value.replaceAll("'", "''");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown setup error';
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      supabaseUrl?: string;
      accessToken?: string;
      userId?: string;
      email?: string;
    };

    const supabaseUrl = body.supabaseUrl?.trim();
    const accessToken = body.accessToken?.trim();
    const userId = body.userId?.trim();
    const email = body.email?.trim().toLowerCase();
    const projectRef = supabaseUrl ? getProjectRef(supabaseUrl) : null;

    if (!supabaseUrl || !projectRef) {
      return NextResponse.json(
        { ok: false, error: 'Enter a valid Supabase project URL.' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Enter a Supabase access token to confirm the admin email.' },
        { status: 400 }
      );
    }

    if (!userId || !email) {
      return NextResponse.json(
        { ok: false, error: 'Missing admin user id or email.' },
        { status: 400 }
      );
    }

    const sql = `
      update auth.users
      set
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
      where id = '${escapeSqlLiteral(userId)}'::uuid
        and lower(email) = '${escapeSqlLiteral(email)}';
    `;

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
        read_only: false,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result?.message || result?.error || 'Supabase could not confirm the admin email.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
