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
      name?: string;
      email?: string;
      password?: string;
    };

    const supabaseUrl = body.supabaseUrl?.trim();
    const accessToken = body.accessToken?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const projectRef = supabaseUrl ? getProjectRef(supabaseUrl) : null;

    if (!supabaseUrl || !projectRef) {
      return NextResponse.json(
        { ok: false, error: 'Enter a valid Supabase project URL.' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Enter a Supabase access token to create the admin.' },
        { status: 400 }
      );
    }

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'Enter admin name, email, and a password with at least 6 characters.' },
        { status: 400 }
      );
    }

    const safeName = escapeSqlLiteral(name);
    const safeEmail = escapeSqlLiteral(email);
    const safePassword = escapeSqlLiteral(password);

    const sql = `
      with upsert_auth_user as (
        insert into auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        )
        values (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          '${safeEmail}',
          crypt('${safePassword}', gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('name', '${safeName}'),
          now(),
          now()
        )
        on conflict (email) do update set
          encrypted_password = excluded.encrypted_password,
          email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
          raw_app_meta_data = excluded.raw_app_meta_data,
          raw_user_meta_data = excluded.raw_user_meta_data,
          updated_at = now()
        returning id, email
      ),
      upsert_identity as (
        insert into auth.identities (
          id,
          user_id,
          provider_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        )
        select
          gen_random_uuid(),
          id,
          id::text,
          jsonb_build_object(
            'sub', id::text,
            'email', email,
            'email_verified', true,
            'phone_verified', false
          ),
          'email',
          now(),
          now(),
          now()
        from upsert_auth_user
        where not exists (
          select 1
          from auth.identities existing_identity
          where existing_identity.user_id = upsert_auth_user.id
            and existing_identity.provider = 'email'
        )
        returning user_id
      )
      insert into public.users (
        id,
        email,
        name,
        role,
        skills,
        wellness_score,
        max_workload
      )
      select
        id,
        email,
        '${safeName}',
        'Admin',
        '{}'::text[],
        85,
        5
      from upsert_auth_user
      on conflict (id) do update set
        email = excluded.email,
        name = excluded.name,
        role = 'Admin',
        wellness_score = 85,
        max_workload = 5;
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
          error: result?.message || result?.error || 'Supabase could not create the admin login.',
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
