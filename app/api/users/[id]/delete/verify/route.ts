import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        // Handle params as Promise if needed (Next.js 15+ compatibility)
        const resolvedParams = await (params as any);
        const { id: userIdToDelete } = resolvedParams;

        console.log(`[DELETE] Verifying OTP and deleting user: ${userIdToDelete}`);

        const { adminEmail, otp } = await request.json();

        if (!adminEmail || !otp) {
            return NextResponse.json({ error: 'Admin email and OTP are required' }, { status: 400 });
        }

        // 1. Verify OTP
        const { data: otpData, error: otpError } = await supabaseAdmin
            .from('otps')
            .select('*')
            .eq('email', adminEmail)
            .eq('otp', otp)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (otpError || !otpData) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        // 2. Perform deletion via RPC
        // admin_delete_user handles deleting from auth.users
        const { error: deleteError } = await supabaseAdmin.rpc('admin_delete_user', {
            p_user_id: userIdToDelete
        });

        if (deleteError) {
            console.error('Error deleting user:', deleteError);
            return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
        }

        // 3. Cleanup OTP (optional but good practice)
        await supabaseAdmin.from('otps').delete().eq('id', otpData.id);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
