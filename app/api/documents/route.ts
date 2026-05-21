
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    try {
        const supabase = getSupabaseForRequest(request);
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return NextResponse.json([], { status: 200 });
        }

        // Map to public shape similar to db.toDocument
        const docs = (data || []).map((d: any) => ({
            id: d.id,
            projectId: d.project_id,
            title: d.title,
            type: d.type,
            content: d.content,
            filePath: d.file_path,
            fileType: d.file_type,
            size: d.size,
            createdBy: d.created_by,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));

        return NextResponse.json(docs);
    } catch (err: any) {
        console.error('Documents GET error:', err);
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
    }
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

        const supabase = getSupabaseForRequest(request);        if (type === 'file') {
            const file = formData.get('file') as File;
            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }

            // Upload to Supabase Storage using per-request or server config
            const supabase = getSupabaseForRequest(request);

            const fileExt = file.name.split('.').pop();
            const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
            }

            // Create DB Entry in `documents` table
            const { data: inserted, error: insertErr } = await supabase
                .from('documents')
                .insert({
                    id: crypto.randomUUID(),
                    project_id: projectId,
                    title: file.name,
                    type: 'file',
                    file_path: uploadData.path,
                    file_type: file.type,
                    size: file.size,
                    created_by: userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();

            if (insertErr) {
                console.error('Error inserting document record:', insertErr);
                return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
            }

            const newDoc = inserted && {
                id: inserted.id,
                projectId: inserted.project_id,
                title: inserted.title,
                type: inserted.type,
                content: inserted.content,
                filePath: inserted.file_path,
                fileType: inserted.file_type,
                size: inserted.size,
                createdBy: inserted.created_by,
                createdAt: inserted.created_at,
                updatedAt: inserted.updated_at,
            };

            return NextResponse.json(newDoc);

        } else if (type === 'page') {
            const title = formData.get('title') as string;
            const content = formData.get('content') as string;

            const { data: inserted, error: insertErr } = await supabase
                .from('documents')
                .insert({
                    id: crypto.randomUUID(),
                    project_id: projectId,
                    title,
                    type: 'page',
                    content,
                    created_by: userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();

            if (insertErr) {
                console.error('Error inserting page document:', insertErr);
                return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
            }

            const newDoc = inserted && {
                id: inserted.id,
                projectId: inserted.project_id,
                title: inserted.title,
                type: inserted.type,
                content: inserted.content,
                filePath: inserted.file_path,
                fileType: inserted.file_type,
                size: inserted.size,
                createdBy: inserted.created_by,
                createdAt: inserted.created_at,
                updatedAt: inserted.updated_at,
            };

            return NextResponse.json(newDoc);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
