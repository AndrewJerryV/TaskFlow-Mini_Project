import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSupabase } from '@/lib/supabase';
import { FormResponse } from '@/types';

type ProjectMemberRow = {
    user_id: string;
    role: string;
};

// GET /api/forms/responses?formId=... OR /api/forms/responses?projectId=...&respondentId=...
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const formId = searchParams.get('formId');
    const projectId = searchParams.get('projectId');
    const respondentId = searchParams.get('respondentId');

    if (projectId && respondentId) {
        const responses = await db.getFormResponsesByRespondent(projectId, respondentId);
        return NextResponse.json(responses);
    }

    if (!formId) {
        return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const responses = await db.getFormResponses(formId);
    return NextResponse.json(responses);
}

// POST /api/forms/responses - Submit or update a form response
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.formId || !body.respondentId) {
            return NextResponse.json({ error: 'formId and respondentId are required' }, { status: 400 });
        }

        const response: FormResponse = {
            id: body.id || crypto.randomUUID(),
            formId: body.formId,
            respondentId: body.respondentId,
            answers: body.answers || {},
            submittedAt: body.submittedAt || new Date().toISOString(),
        };

        const result = await db.upsertFormResponse(response);
        if (!result) {
            return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
        }

        // Trigger notification
        try {
            const form = await db.getFormById(body.formId);
            if (form) {
                const respondent = await db.getUser(body.respondentId);
                const respondentName = respondent ? respondent.name : 'A user';

                const notificationTitle = 'New Form Response';
                const notificationMessage = `${respondentName} submitted a response to "${form.title}"`;
                const notificationLink = `/projects/${form.projectId}?tab=Forms`;

                // Notify form creator
                await db.addNotification({
                    userId: form.createdBy,
                    type: 'new_form',
                    title: notificationTitle,
                    message: notificationMessage,
                    link: notificationLink,
                    entityId: form.id,
                    projectId: form.projectId,
                });

                // Also notify managers/admins in the project
                const { data: members } = await getSupabase()
                    .from('project_members')
                    .select('user_id, role')
                    .eq('project_id', form.projectId);

                const memberRows = (members || []) as ProjectMemberRow[];
                if (memberRows.length > 0) {
                    for (const member of memberRows) {
                        if ((member.role === 'Manager' || member.role === 'Admin') && member.user_id !== form.createdBy) {
                            await db.addNotification({
                                userId: member.user_id,
                                type: 'new_form',
                                title: notificationTitle,
                                message: notificationMessage,
                                link: notificationLink,
                                entityId: form.id,
                                projectId: form.projectId,
                            });
                        }
                    }
                }
            }
        } catch (notifError) {
            console.error('Error triggering form notification:', notifError);
            // Don't fail the response if notification fails
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error submitting form response:', error);
        return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    }
}
