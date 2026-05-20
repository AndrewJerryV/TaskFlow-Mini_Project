import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;

        if (!docId) {
            return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
        }

        const supabase = getSupabaseForRequest(request);
        const { error } = await supabase.from('documents').delete().eq('id', docId);
        const success = !error;

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

        const supabase = getSupabaseForRequest(request);
        const { error } = await supabase.from('documents').update({ title, content }).eq('id', docId);
        const success = !error;

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
