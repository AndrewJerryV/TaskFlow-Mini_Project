import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Form } from '@/types';

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error';

// GET /api/forms?projectId=...
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const forms = await db.getForms(projectId);
    return NextResponse.json(forms);
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

        await db.addForm(form);

        if (form.status === 'active') {
            const projectMembers = await db.getProjectMembers(form.projectId);
            const creator = await db.getUser(form.createdBy);
            const project = await db.getProject(form.projectId);
            const membersToNotify = projectMembers.filter(memberId => memberId !== form.createdBy);

            for (const memberId of membersToNotify) {
                await db.addNotification({
                    userId: memberId,
                    type: 'new_form',
                    title: 'New Form Activated',
                    message: `${creator?.name || 'Someone'} published form "${form.title}" in ${project?.name || 'a project'}`,
                    link: `/projects/${form.projectId}?tab=forms`,
                    entityId: form.id,
                    projectId: form.projectId,
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

        const updatedForm = await db.updateForm(id, updates);
        if (!updatedForm) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        return NextResponse.json(updatedForm);
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

    const success = await db.deleteForm(id);
    if (!success) {
        return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
