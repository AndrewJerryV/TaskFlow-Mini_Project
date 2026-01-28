import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;

        if (!docId) {
            return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
        }

        const success = await db.deleteDocument(docId);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
        }
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const body = await request.json();
        const { title, content } = body;

        if (!docId) {
            return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
        }

        if (!title && content === undefined) {
            return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
        }

        const success = await db.updateDocument(docId, { title, content });

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
        }
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
