import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FormResponse } from '@/types';

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

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error submitting form response:', error);
        return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    }
}
