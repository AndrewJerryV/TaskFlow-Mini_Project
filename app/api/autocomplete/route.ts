import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error';

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseForRequest(request);
        const { data, error } = await supabase.from('autocomplete').select('*');
        if (error) {
            console.error('Autocomplete fetch error:', error);
            return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
        }
        return NextResponse.json(data || []);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
