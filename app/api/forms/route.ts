import { NextRequest, NextResponse } from 'next/server';
import { Form } from '@/types';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

function sanitizeForm(row: Record<string, unknown>): Record<string, unknown> {
    return {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: row.description || '',
        fields: row.fields || [],
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error';

// GET /api/forms?projectId=...
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const supabase = getSupabaseForRequest(request);
    const { data: forms } = await supabase.from('forms').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    return NextResponse.json((forms || []).map(sanitizeForm));
}

// POST /api/forms - Create a new form
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const form: Form = {
            id: body.id || crypto.randomUUID(),
            projectId: body.projectId,
            title: body.title,
            description: body.description || '',
            fields: body.fields || [],
            status: body.status || 'draft',
            createdBy: body.createdBy,
            createdAt: body.createdAt || new Date().toISOString(),
            updatedAt: body.updatedAt || new Date().toISOString(),
        };

        const supabase = getSupabaseForRequest(request);
        const { error: insertErr } = await supabase.from('forms').insert({
            id: form.id,
            project_id: form.projectId,
            title: form.title,
            description: form.description,
            fields: form.fields || [],
            status: form.status,
            created_by: form.createdBy,
            created_at: form.createdAt,
            updated_at: form.updatedAt
        });

        if (insertErr) {
            console.error('Error inserting form:', insertErr);
            return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
        }

        if (form.status === 'active') {
            const { data: projectMembers } = await supabase.from('project_members').select('user_id').eq('project_id', form.projectId);
            const { data: creator } = await supabase.from('users').select('id, name').eq('id', form.createdBy).maybeSingle();
            const { data: project } = await supabase.from('projects').select('*').eq('id', form.projectId).maybeSingle();
            const membersToNotify = (projectMembers || []).map((m: any) => m.user_id).filter((id: string) => id !== form.createdBy);

            for (const memberId of membersToNotify) {
                await supabase.from('notifications').insert({
                    user_id: memberId,
                    type: 'new_form',
                    title: 'New Form Activated',
                    message: `${creator?.name || 'Someone'} published form "${form.title}" in ${project?.name || 'a project'}`,
                    link: `/projects/${form.projectId}?tab=forms`,
                    entity_id: form.id,
                    project_id: form.projectId,
                    is_read: false,
                    created_at: new Date().toISOString()
                });
            }
        }

        return NextResponse.json(form, { status: 201 });
    } catch (error) {
        console.error('Error creating form:', error);
        return NextResponse.json({ error: getErrorMessage(error) || 'Failed to create form' }, { status: 500 });
    }
}

// PATCH /api/forms - Update a form
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Form id is required' }, { status: 400 });
        }

        const supabase2 = getSupabaseForRequest(request);
        const { data: updatedForm, error: updateErr } = await supabase2.from('forms').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
        if (updateErr || !updatedForm) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        return NextResponse.json(sanitizeForm(updatedForm));
    } catch (error) {
        console.error('Error updating form:', error);
        return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
    }
}

// DELETE /api/forms?id=...
export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Form id is required' }, { status: 400 });
    }

    const supabase3 = getSupabaseForRequest(request);
    const { error: deleteErr } = await supabase3.from('forms').delete().eq('id', id);
    if (deleteErr) return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
    return NextResponse.json({ success: true });
}
