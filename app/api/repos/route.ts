import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    return NextResponse.json(await db.getRepoLinks(projectId));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.project_id || !body.name || !body.url || !body.owner || !body.repo)
            return NextResponse.json({ error: 'project_id, name, url, owner, and repo are required' }, { status: 400 });
        const repoLink = await db.addRepoLink({
            id: body.id || crypto.randomUUID(),
            project_id: body.project_id,
            name: body.name,
            url: body.url,
            owner: body.owner,
            repo: body.repo,
            description: body.description,
        });
        if (!repoLink)
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
    const success = await db.deleteRepoLink(id);
    if (!success) return NextResponse.json({ error: 'Failed to delete repository' }, { status: 500 });
    return NextResponse.json({ success: true });
}
