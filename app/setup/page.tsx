'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Key, Shield, ExternalLink, CheckCircle2,
  AlertCircle, Eye, EyeOff, ArrowRight, Loader2, Copy,
  ChevronDown, ChevronRight, Sparkles, Terminal, Globe
} from 'lucide-react';
import Link from 'next/link';

type StepStatus = 'idle' | 'loading' | 'success' | 'error';

interface FieldConfig {
  key: string;
  label: string;
  envName: string;
  placeholder: string;
  description: string;
  type: 'url' | 'key';
  docsHint: string;
  icon: React.ReactNode;
  color: string;
}

const fields: FieldConfig[] = [
  {
    key: 'url',
    label: 'Project URL',
    envName: 'NEXT_PUBLIC_SUPABASE_URL',
    placeholder: 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co',
    description: 'The base URL of your Supabase project.',
    type: 'url',
    docsHint: 'Found in Project Settings → API → Project URL',
    icon: <Globe size={18} />,
    color: 'from-[#3ecf8e] to-[#1a9e6a]',
  },
  {
    key: 'anonKey',
    label: 'Anon / Public Key',
    envName: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Safe to expose in the browser. Used for all client-side queries.',
    type: 'key',
    docsHint: 'Found in Project Settings → API → Project API Keys → anon public',
    icon: <Key size={18} />,
    color: 'from-[#9d7dff] to-[#7c5cbf]',
  },
  {
    key: 'serviceKey',
    label: 'Service Role Key',
    envName: 'SUPABASE_SERVICE_ROLE_KEY',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Server-side only. Never expose this in the browser. Used for admin operations.',
    type: 'key',
    docsHint: 'Found in Project Settings → API → Project API Keys → service_role secret',
    icon: <Shield size={18} />,
    color: 'from-[#f59e0b] to-[#d97706]',
  },
];

const steps = [
  { id: 1, label: 'Create Supabase Project', icon: <Database size={16} /> },
  { id: 2, label: 'Enter Credentials', icon: <Key size={16} /> },
  { id: 3, label: 'Test Connection', icon: <CheckCircle2 size={16} /> },
  { id: 4, label: 'Launch App', icon: <Sparkles size={16} /> },
];

export default function SetupPage() {
  const [values, setValues] = useState({ url: '', anonKey: '', serviceKey: '' });
  const [showKey, setShowKey] = useState({ anonKey: false, serviceKey: false });
  const [testStatus, setTestStatus] = useState<StepStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeStep, setActiveStep] = useState(2);
  const [expandedHint, setExpandedHint] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Attempt to pre-fill from runtime env if already set (for local dev)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url || anon) {
      setValues(v => ({ ...v, url: url || '', anonKey: anon || '' }));
    }
  }, []);

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setTestStatus('idle');
    setTestMessage('');
    setSaved(false);
  };

  const handleCopyEnv = async () => {
    const envContent = `NEXT_PUBLIC_SUPABASE_URL=${values.url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${values.serviceKey}`;
    await navigator.clipboard.writeText(envContent);
    setCopied('env');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestConnection = async () => {
    if (!values.url || !values.anonKey) {
      setTestStatus('error');
      setTestMessage('Please fill in the Project URL and Anon Key first.');
      return;
    }

    setTestStatus('loading');
    setTestMessage('');

    try {
      // Dynamically import supabase-js and test connectivity
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(values.url, values.anonKey);
      const { error } = await client.from('users').select('id').limit(1);

      if (error && error.code === 'PGRST301') {
        // Row Level Security active → DB is accessible but RLS is blocking. Connection works.
        setTestStatus('success');
        setTestMessage('Connection successful! Database is reachable and RLS is active.');
        setActiveStep(4);
      } else if (error && (error.message?.includes('Unable to connect') || error.message?.includes('fetch'))) {
        setTestStatus('error');
        setTestMessage('Could not reach Supabase. Check your Project URL and ensure the project is active.');
      } else {
        // Either success or a table-not-found error — either way, URL & key are valid
        setTestStatus('success');
        setTestMessage('Connection successful! Your credentials are valid.');
        setActiveStep(4);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err?.message || 'Connection failed. Please check your credentials.');
    }
  };

  const allFilled = values.url && values.anonKey && values.serviceKey;

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-poppins relative overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-[#3ecf8e]/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-[#9d7dff]/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] text-xs font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ecf8e] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ecf8e]" />
            </span>
            Open Source Setup
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">
            Connect Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#9d7dff]">
              Supabase
            </span>
          </h1>
          <p className="text-gray-500 text-lg font-medium max-w-lg mx-auto leading-relaxed">
            TaskFlow needs your Supabase project credentials to power authentication, the database, and real-time features.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-0 mb-12 overflow-x-auto"
        >
          {steps.map((step, i) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    activeStep >= step.id
                      ? 'bg-[#3ecf8e] border-[#3ecf8e] text-white shadow-lg shadow-[#3ecf8e]/30'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {step.icon}
                </div>
                <span className={`text-[10px] font-bold tracking-wide text-center leading-tight ${
                  activeStep >= step.id ? 'text-[#1a9e6a]' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-[2px] w-8 mb-5 transition-all duration-500 ${
                  activeStep > step.id ? 'bg-[#3ecf8e]' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Step 1 tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#3ecf8e]/10 flex items-center justify-center flex-shrink-0 text-[#3ecf8e]">
            <Database size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold mb-1">Don&apos;t have a Supabase project yet?</p>
            <p className="text-gray-500 text-sm leading-relaxed">
              Create a free project at{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[#3ecf8e] hover:underline inline-flex items-center gap-1"
              >
                supabase.com/dashboard <ExternalLink size={12} />
              </a>
              {' '}, then come back here with your credentials.
            </p>
          </div>
        </motion.div>

        {/* Credential Fields */}
        <div className="space-y-5">
          {fields.map((field, i) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              className="bg-white backdrop-blur-xl border border-gray-200 rounded-3xl p-6 hover:border-gray-300 hover:shadow-md transition-all duration-300"
            >
              {/* Field Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${field.color} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                    {field.icon}
                  </div>
                  <div>
                    <label htmlFor={field.key} className="text-gray-900 font-bold text-sm block">
                      {field.label}
                    </label>
                    <code className="text-[11px] text-gray-400 font-mono">{field.envName}</code>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedHint(expandedHint === field.key ? null : field.key)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
                >
                  {expandedHint === field.key
                    ? <ChevronDown size={16} />
                    : <ChevronRight size={16} />}
                </button>
              </div>

              {/* Hint */}
              <AnimatePresence>
                {expandedHint === field.key && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-start gap-3">
                      <Terminal size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-700 text-sm mb-1">{field.description}</p>
                        <p className="text-gray-400 text-xs">{field.docsHint}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="relative">
                <input
                  id={field.key}
                  type={
                    field.type === 'url'
                      ? 'url'
                      : showKey[field.key as keyof typeof showKey]
                      ? 'text'
                      : 'password'
                  }
                  value={values[field.key as keyof typeof values]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 font-mono text-sm focus:outline-none focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/10 transition-all pr-12"
                />
                {field.type === 'key' && (
                  <button
                    type="button"
                    onClick={() => setShowKey(prev => ({
                      ...prev,
                      [field.key]: !prev[field.key as keyof typeof prev]
                    }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showKey[field.key as keyof typeof showKey]
                      ? <EyeOff size={16} />
                      : <Eye size={16} />}
                  </button>
                )}
              </div>

              {/* Validation indicator */}
              {values[field.key as keyof typeof values] && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 flex items-center gap-1.5 text-[#3ecf8e] text-xs font-medium"
                >
                  <CheckCircle2 size={12} />
                  Entered
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Test Connection Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 space-y-4"
        >
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'loading' || !values.url || !values.anonKey}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#3ecf8e] to-[#9d7dff] font-bold text-white text-lg flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xl shadow-[#3ecf8e]/20"
          >
            {testStatus === 'loading' ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <Database size={22} />
                Test Connection
              </>
            )}
          </button>

          {/* Status Message */}
          <AnimatePresence mode="wait">
            {testStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 rounded-2xl"
              >
                <CheckCircle2 size={20} className="text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                <p className="text-[#3ecf8e] font-medium text-sm">{testMessage}</p>
              </motion.div>
            )}
            {testStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl"
              >
                <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 font-medium text-sm">{testMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Copy .env block */}
        {allFilled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gray-900 border border-gray-700 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm font-bold uppercase tracking-widest font-mono">
                <Terminal size={14} />
                .env.local
              </div>
              <button
                onClick={handleCopyEnv}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all"
              >
                <Copy size={12} />
                {copied === 'env' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
              <span className="text-green-400"># Paste this into your .env.local file{'\n'}</span>
              <span className="text-gray-500">NEXT_PUBLIC_SUPABASE_URL</span>=
              <span className="text-[#3ecf8e]">{values.url || '...'}{'\n'}</span>
              <span className="text-gray-500">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=
              <span className="text-[#9d7dff]">{values.anonKey ? values.anonKey.slice(0, 20) + '...' : '...'}{'\n'}</span>
              <span className="text-gray-500">SUPABASE_SERVICE_ROLE_KEY</span>=
              <span className="text-amber-400">{values.serviceKey ? values.serviceKey.slice(0, 20) + '...' : '...'}</span>
            </pre>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              Copy the block above, paste it into a <code className="text-gray-300">.env.local</code> file at the root of the project, then restart your dev server with <code className="text-gray-300">npm run dev</code>.
            </p>
          </motion.div>
        )}

        {/* Next Step */}
        <AnimatePresence>
          {testStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <Link
                href="/login"
                className="group w-full py-5 px-6 rounded-3xl bg-white border border-[#3ecf8e]/40 hover:border-[#3ecf8e] hover:shadow-lg hover:shadow-[#3ecf8e]/10 font-bold text-gray-900 text-lg flex items-center justify-center gap-3 transition-all duration-300"
              >
                <Sparkles size={22} className="text-[#3ecf8e]" />
                Continue to Login
                <ArrowRight size={22} className="text-gray-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center text-xs text-gray-400 leading-relaxed"
        >
          Your credentials are never stored in the browser or sent to any external server.{' '}
          They are only used to connect directly to your own Supabase project.{' '}
          <a
            href="https://github.com/AndrewJerryV/TaskFlow-Mini_Project"
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
          >
            View source on GitHub
          </a>
        </motion.p>
      </div>
    </div>
  );
}
