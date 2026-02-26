import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/form-links?projectId=...
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const formLinks = await db.getFormLinks(projectId);
    return NextResponse.json(formLinks);
}

// POST /api/form-links - Add a form link
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.project_id || !body.title || !body.form_url) {
            return NextResponse.json({ error: 'project_id, title, and form_url are required' }, { status: 400 });
        }

        const formLink = await db.addFormLink({
            id: body.id || crypto.randomUUID(),
            project_id: body.project_id,
            title: body.title,
            description: body.description,
            form_url: body.form_url,
            created_by: body.created_by,
        });

        if (!formLink) {
            return NextResponse.json({ error: 'Failed to add form link' }, { status: 500 });
        }

        return NextResponse.json(formLink, { status: 201 });
    } catch (error) {
        console.error('Error adding form link:', error);
        return NextResponse.json({ error: 'Failed to add form link' }, { status: 500 });
    }
}

// DELETE /api/form-links?id=...
export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Form link id is required' }, { status: 400 });
    }

    const success = await db.deleteFormLink(id);
    if (!success) {
        return NextResponse.json({ error: 'Failed to delete form link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
