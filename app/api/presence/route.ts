import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// POST: Update presence
export async function POST(req: Request) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  const supabase = getSupabase();
  const { error } = await supabase
    .from('presence')
    .upsert({ user_id: userId, last_active: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// GET: Get online users (active in last 60s)
export async function GET() {
  const supabase = getSupabase();
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('presence')
    .select('user_id')
    .gte('last_active', since);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ onlineUserIds: data.map((row: any) => row.user_id) });
}
