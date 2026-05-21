import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        // Handle params as Promise if needed (Next.js 15+ compatibility)
        const resolvedParams = await Promise.resolve(params);
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
    } catch (error) {
        console.error('API Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
