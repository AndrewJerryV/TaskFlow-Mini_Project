import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FormResponse } from '@/types';

// GET /api/forms/responses?formId=...
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const formId = searchParams.get('formId');

    if (!formId) {
        return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const responses = await db.getFormResponses(formId);
    return NextResponse.json(responses);
}

// POST /api/forms/responses - Submit a form response
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response: FormResponse = {
            id: body.id || crypto.randomUUID(),
            formId: body.formId,
            respondentId: body.respondentId,
            answers: body.answers || {},
            submittedAt: body.submittedAt || new Date().toISOString(),
        };

        await db.addFormResponse(response);
        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Error submitting form response:', error);
        return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    }
}
