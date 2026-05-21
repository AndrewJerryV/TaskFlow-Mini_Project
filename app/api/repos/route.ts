import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    const supabase = getSupabaseForRequest(request);
    const { data } = await supabase.from('repo_links').select('*').eq('project_id', projectId);
    return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.project_id || !body.name || !body.url || !body.owner || !body.repo)
            return NextResponse.json({ error: 'project_id, name, url, owner, and repo are required' }, { status: 400 });
        const supabase = getSupabaseForRequest(request);
        const newLink = {
            id: body.id || crypto.randomUUID(),
            project_id: body.project_id,
            name: body.name,
            url: body.url,
            owner: body.owner,
            repo: body.repo,
            description: body.description,
        };
        const { data: repoLink, error } = await supabase.from('repo_links').insert(newLink).select().maybeSingle();
        if (error || !repoLink)
            return NextResponse.json({ error: 'Failed to add repository' }, { status: 500 });
        return NextResponse.json(repoLink, { status: 201 });
    } catch (error) {
        console.error('Error adding repository:', error);
        return NextResponse.json({ error: 'Failed to add repository' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Repository id is required' }, { status: 400 });
    const supabase = getSupabaseForRequest(request);
    const { error } = await supabase.from('repo_links').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Failed to delete repository' }, { status: 500 });
    return NextResponse.json({ success: true });
}
