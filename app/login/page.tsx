'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';

export default function LoginPage() {

  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  // Redirect only AFTER auth is resolved
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/');
    }
  }, [currentUser, isLoading, router]);

  const signInWithGoogle = async () => {
    const supabase = getSupabase();

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 👇 come back to login page, not directly to "/"
        redirectTo: `${window.location.origin}/login`
      }
    });
  };

  const signInWithGithub = async () => {
    const supabase = getSupabase();

    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // 👇 same here
        redirectTo: `${window.location.origin}/login`
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/icon.svg" alt="TaskFlow" className="h-full w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to TaskFlow</h1>
          <p className="text-gray-500 mt-2">Sign in to continue</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>

          <button
            onClick={signInWithGithub}
            className="w-full py-3 px-4 border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            <img
              src="https://www.svgrepo.com/show/512317/github-142.svg"
              alt="GitHub"
              className="w-5 h-5"
            />
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}