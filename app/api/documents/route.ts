
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

// Helper to get raw supabase client for storage uploads (if needed)
// Assuming we use the standard client for now, or the one from lib/db
// However, next/server requires correct headers or service role for specialized ops.
// For this prototype, we'll try to use the client directly if possible, or assume public bucket.

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const docs = await db.getDocuments(projectId);
    return NextResponse.json(docs);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const type = formData.get('type') as string;
        const projectId = formData.get('projectId') as string;
        const userId = formData.get('userId') as string;

        if (!projectId || !userId) {
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        if (type === 'file') {
            const file = formData.get('file') as File;
            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }

            // Upload to Supabase Storage
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const fileExt = file.name.split('.').pop();
            const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
            }

            // Create DB Entry
            const newDoc = await db.createDocument({
                id: crypto.randomUUID(),
                projectId,
                title: file.name,
                type: 'file',
                filePath: uploadData.path,
                fileType: file.type,
                size: file.size,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return NextResponse.json(newDoc);

        } else if (type === 'page') {
            const title = formData.get('title') as string;
            const content = formData.get('content') as string;

            const newDoc = await db.createDocument({
                id: crypto.randomUUID(),
                projectId,
                title,
                type: 'page',
                content,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return NextResponse.json(newDoc);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
