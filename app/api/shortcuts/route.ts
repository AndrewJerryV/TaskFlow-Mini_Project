import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    return NextResponse.json(await db.getShortcuts(projectId));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.project_id || !body.name || !body.url)
            return NextResponse.json({ error: 'project_id, name, and url are required' }, { status: 400 });
        const shortcut = await db.addShortcut({
            id: body.id || crypto.randomUUID(),
            project_id: body.project_id,
            name: body.name,
            url: body.url,
            type: body.type || 'link',
        });
        if (!shortcut)
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
    const success = await db.deleteShortcut(id);
    if (!success) return NextResponse.json({ error: 'Failed to delete shortcut' }, { status: 500 });
    return NextResponse.json({ success: true });
}
