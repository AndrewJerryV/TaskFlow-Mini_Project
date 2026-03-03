import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOTPEmail } from '@/lib/email';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Fallback if service role not set
);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await (params as any);
        const { id: userIdToDelete } = resolvedParams;
        const { adminEmail } = await request.json();

        if (!adminEmail) {
            return NextResponse.json({ error: 'Admin email is required' }, { status: 400 });
        }

        // 1. Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 2. Store OTP in database
        const { error: dbError } = await supabaseAdmin
            .from('otps')
            .insert({
                email: adminEmail,
                otp: otp,
                expires_at: expiresAt.toISOString()
            });

        if (dbError) {
            console.error('Error storing OTP:', dbError);
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
        }

        // 3. Send OTP email
        await sendOTPEmail(adminEmail, otp);

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
