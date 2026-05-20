import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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

    const supabase = getSupabaseForRequest(request);
    if (projectId && respondentId) {
        const { data: responses } = await supabase
            .from('form_responses')
            .select('*')
            .eq('project_id', projectId)
            .eq('respondent_id', respondentId);
        return NextResponse.json(responses || []);
    }

    if (!formId) {
        return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const { data: responses } = await supabase.from('form_responses').select('*').eq('form_id', formId);
    return NextResponse.json(responses || []);
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

        const supabase = getSupabaseForRequest(request);
        const { data: upsertData, error: upsertError } = await supabase
            .from('form_responses')
            .upsert({
                id: response.id,
                form_id: response.formId,
                respondent_id: response.respondentId,
                answers: response.answers,
                submitted_at: response.submittedAt,
            })
            .select();

        if (upsertError) {
            console.error('Upsert error', upsertError);
            return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
        }

        // Trigger notification
        try {
            const { data: form } = await supabase.from('forms').select('*').eq('id', body.formId).maybeSingle();
            if (form) {
                const { data: respondent } = await supabase.from('users').select('id, name').eq('id', body.respondentId).maybeSingle();
                const respondentName = respondent ? respondent.name : 'A user';

                const notificationTitle = 'New Form Response';
                const notificationMessage = `${respondentName} submitted a response to "${form.title}"`;
                const notificationLink = `/projects/${form.project_id}?tab=Forms`;

                // Notify form creator
                await supabase.from('notifications').insert({
                    user_id: form.created_by,
                    type: 'new_form',
                    title: notificationTitle,
                    message: notificationMessage,
                    link: notificationLink,
                    entity_id: form.id,
                    project_id: form.project_id,
                });

                // Also notify managers/admins in the project
                const { data: members } = await getSupabaseAdmin()
                    .from('project_members')
                    .select('user_id, role')
                    .eq('project_id', form.project_id);

                const memberRows = (members || []) as ProjectMemberRow[];
                if (memberRows.length > 0) {
                    for (const member of memberRows) {
                        if ((member.role === 'Manager' || member.role === 'Admin') && member.user_id !== form.created_by) {
                            await supabase.from('notifications').insert({
                                user_id: member.user_id,
                                type: 'new_form',
                                title: notificationTitle,
                                message: notificationMessage,
                                link: notificationLink,
                                entity_id: form.id,
                                project_id: form.project_id,
                            });
                        }
                    }
                }
            }
        } catch (notifError) {
            console.error('Error triggering form notification:', notifError);
            // Don't fail the response if notification fails
        }

        const result = upsertData || [];
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error submitting form response:', error);
        return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    }
}
