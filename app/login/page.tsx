'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteUrl } from '@/lib/site-url';
import { getSupabase } from '../../lib/supabase';
import 'altcha';

export default function LoginPage() {
  const { currentUser, isLoading, authError, setAuthError } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [altchaPayload, setAltchaPayload] = useState<string | null>(null);
  const [altchaVerified, setAltchaVerified] = useState(false);
  const altchaRef = useRef<HTMLElement | null>(null);
  const altchaWidgetStyle: React.CSSProperties & Record<`--${string}`, string> = {
    '--altcha-max-width': '100%',
    '--altcha-padding': '0.48rem',
    '--altcha-border-radius': '14px',
    '--altcha-border-color': '#c7d2fe',
    '--altcha-checkbox-size': '18px',
    '--altcha-color-base': '#f8fbff',
    '--altcha-color-base-content': '#111827',
    '--altcha-color-neutral': '#dbeafe',
    '--altcha-color-neutral-content': '#4b5563',
    '--altcha-color-primary': '#2563eb',
    '--altcha-color-success': '#16a34a',
    display: 'block',
    width: '100%',
  };

  useEffect(() => {
    const widget = altchaRef.current;
    if (!widget) return;

    const onStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: string; payload?: string | null }>).detail;
      if (!detail) return;

      if (detail.state === 'verified' && detail.payload) {
        setAltchaPayload(detail.payload);
        setAltchaVerified(true);
        return;
      }

      if (detail.state !== 'verifying') {
        setAltchaVerified(false);
      }
    };

    const onExpired = () => {
      setAltchaPayload(null);
      setAltchaVerified(false);
    };

    widget.addEventListener('statechange', onStateChange);
    widget.addEventListener('expired', onExpired);

    return () => {
      widget.removeEventListener('statechange', onStateChange);
      widget.removeEventListener('expired', onExpired);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const loginRedirectUrl = getSiteUrl('/login');

  const resetAltcha = () => {
    setAltchaPayload(null);
    setAltchaVerified(false);
    (altchaRef.current as any)?.reset?.();
  };

  const showAltchaRequiredMessage = () => {
    setSuccess('');
    setError('Please complete CAPTCHA verification before signing in.');
  };

  const verifyAltcha = async () => {
    if (!altchaPayload) {
      showAltchaRequiredMessage();
      return false;
    }

    const verifyRes = await fetch('/api/altcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: altchaPayload })
    });

    const verifyData = await verifyRes.json().catch(() => ({ success: false }));

    if (!verifyRes.ok || !verifyData.success) {
      setError(verifyData.error || 'ALTCHA verification failed. Please try again.');
      resetAltcha();
      return false;
    }

    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAuthError('');
    setSubmitting(true);
    let shouldResetAltcha = true;

    try {
      const altchaValid = await verifyAltcha();
      if (!altchaValid) return;

      const supabase = getSupabase();

      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: loginRedirectUrl
          }
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess('Check your email for a verification link. Once verified, you can sign in.');
          setEmail('');
          setPassword('');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            setError('Please verify your email before signing in. Check your inbox for the verification link.');
          } else {
            setError(signInError.message);
          }
        } else {
          shouldResetAltcha = false;
          setSuccess('Signing you in...');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      if (shouldResetAltcha) {
        resetAltcha();
      }
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setSuccess('');
    setAuthError('');
    const altchaValid = await verifyAltcha();
    if (!altchaValid) return;
    const supabase = getSupabase();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: loginRedirectUrl
      }
    });
    if (signInError) {
      setError(signInError.message);
      resetAltcha();
    }
  };

  const signInWithGithub = async () => {
    setError('');
    setSuccess('');
    setAuthError('');
    const altchaValid = await verifyAltcha();
    if (!altchaValid) return;
    const supabase = getSupabase();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: loginRedirectUrl
      }
    });
    if (signInError) {
      setError(signInError.message);
      resetAltcha();
    }
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
    <div className="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 w-full max-w-md">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <img src="/icon.svg" alt="TaskFlow" className="h-full w-auto" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to TaskFlow</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min 6 characters' : '********'}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div>
            <altcha-widget
              ref={altchaRef}
              challenge="/api/altcha/challenge"
              type="checkbox"
              auto="off"
              configuration='{"hideFooter":true}'
              className="w-full overflow-hidden rounded-[15px] shadow-sm ring-1 ring-blue-100"
              style={altchaWidgetStyle}
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            onClick={() => {
              if (!altchaVerified) showAltchaRequiredMessage();
            }}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
          >
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400">or continue with</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
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
            className="w-full py-2.5 px-4 border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
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
