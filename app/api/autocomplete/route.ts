import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error';

export async function GET() {
    try {
        const data = await db.getAutocompleteData();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
