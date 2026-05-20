import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    const supabase = getSupabaseForRequest(request);
    const { data } = await supabase.from('shortcuts').select('*').eq('project_id', projectId);
    return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.project_id || !body.name || !body.url)
            return NextResponse.json({ error: 'project_id, name, and url are required' }, { status: 400 });
        const supabase = getSupabaseForRequest(request);
        const newShortcut = {
            id: body.id || crypto.randomUUID(),
            project_id: body.project_id,
            name: body.name,
            url: body.url,
            type: body.type || 'link',
        };
        const { data: shortcut, error } = await supabase.from('shortcuts').insert(newShortcut).select().maybeSingle();
        if (error || !shortcut)
            return NextResponse.json({ error: 'Failed to create shortcut' }, { status: 500 });
        return NextResponse.json(shortcut, { status: 201 });
    } catch (error) {
        console.error('Error creating shortcut:', error);
        return NextResponse.json({ error: 'Failed to create shortcut' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Shortcut id is required' }, { status: 400 });
    const supabase = getSupabaseForRequest(request);
    const { error } = await supabase.from('shortcuts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Failed to delete shortcut' }, { status: 500 });
    return NextResponse.json({ success: true });
}
