-- Create OTPs table for verification
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_otps_email_otp ON public.otps(email, otp);

-- Function to admin delete user
-- This needs SECURITY DEFINER because it manages auth.users
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete from public.profiles (if it exists and has triggers/RLS that might block auth delete)
    -- Actually, in many Supabase setups, deleting from auth.users cascades to public.profiles
    -- but we'll be explicit if needed.
    
    -- Delete from auth.users (requires superuser/service role, so we use security definer)
    -- Note: This requires the function to be owned by a role that can delete from auth.users
    -- Typically 'supabase_admin' or just 'postgres'.
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
