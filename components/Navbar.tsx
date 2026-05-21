'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutGrid, Zap, Github } from 'lucide-react';

export default function Navbar() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-6 py-4 ${
        scrolled 
          ? 'bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 shadow-sm' 
          : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/landing" className="flex items-center gap-3">
  <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
    <img src="/icon.svg" alt="TaskFlow" className="w-full h-full object-contain" />
  </div>
  <span className="text-3xl font-extrabold tracking-tighter text-gray-900 dark:text-white font-poppins capitalize">
    TaskFlow
  </span>
</Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          <Link href="#features" className="text-sm font-semibold text-gray-500 hover:text-accent-green transition-colors">Features</Link>
          <Link href="#ai" className="text-sm font-semibold text-gray-500 hover:text-accent-green transition-colors">AI Engine</Link>
          <Link href="#collaboration" className="text-sm font-semibold text-gray-500 hover:text-accent-green transition-colors">Collaboration</Link>
          <a href="https://github.com/AndrewJerryV/TaskFlow-Mini_Project" target="_blank" className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-accent-green transition-colors">
            <Github size={18} />
            GitHub
          </a>
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <Link 
              href="/dashboard" 
              className="px-6 py-2.5 bg-gradient-to-r from-accent-green to-[#9d7dff] text-white rounded-full font-bold text-sm hover:translate-y-[-2px] hover:shadow-xl hover:shadow-accent-green/30 transition-all flex items-center gap-2"
            >
              Dashboard
              <LayoutGrid size={16} />
            </Link>
          ) : (
            <Link 
  href="/setup" 
  className="px-6 py-2.5 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-full font-bold text-sm hover:bg-accent-blue/20 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-accent-blue/20 transition-all flex items-center gap-2 backdrop-blur-md"
>
  Get Started
  <ArrowRight size={16} />
</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
