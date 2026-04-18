'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { 
  ArrowRight, Activity, Users, Zap, Shield, Sparkles, 
  Layout, MousePointer2, Github, CheckCircle2, 
  Search, BarChart3, MessageSquare, Heart
} from 'lucide-react';
import Link from 'next/link';

// Animation Variants
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  
  // Parallax effects
  const orb1Y = useTransform(scrollY, [0, 1000], [0, 200]);
  const orb2Y = useTransform(scrollY, [0, 1000], [0, -150]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.95]);

  return (
    <div className="relative min-h-screen bg-[#f8f9fc] dark:bg-[#030303] overflow-x-hidden font-poppins selection:bg-accent-green/30 selection:text-accent-green">
      <Navbar />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-[0.4] dark:opacity-[0.1]"></div>
        <motion.div style={{ y: orb1Y }} className="absolute -top-[250px] -left-[150px] w-[700px] h-[700px] bg-accent-greenLight dark:bg-accent-green/5 blur-[140px] rounded-full" />
        <motion.div style={{ y: orb2Y }} className="absolute -bottom-[200px] -right-[150px] w-[600px] h-[600px] bg-accent-leafLight dark:bg-accent-leaf/5 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-tealLight dark:bg-accent-teal/5 blur-[140px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 z-10 flex flex-col items-center text-center">
        <div className="container max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent-greenLight dark:bg-accent-green/10 border border-accent-green/10 text-accent-green text-xs font-bold uppercase tracking-widest mb-10 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-leaf opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-leaf"></span>
            </span>
            <span>Powered by Machine Learning</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tighter mb-8"
          >
            Manage Projects with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-green via-accent-blue to-accent-leaf">
              AI-Driven Intelligence
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
          >
            TaskFlow is a next-generation project management platform that combines intuitive Kanban workflows with ML-powered recommendations, bottleneck detection, and wellness monitoring.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20"
          >
            <Link 
              href="/login"
              className="group relative w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-accent-green to-[#9d7dff] text-white rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-accent-green/20"
            >
              <span className="relative z-10 flex items-center gap-3">
                Get Started
                <ArrowRight size={20} />
              </span>
            </Link>
          </motion.div>

          <motion.div 
            style={{ scale: heroScale }}
            className="relative mt-20 perspective-1000"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-green via-accent-blue to-accent-leaf rounded-[2.5rem] blur-2xl opacity-20 dark:opacity-40 animate-pulse"></div>
            <img 
              src="/hero-dashboard.png" 
              alt="TaskFlow Dashboard" 
              className="relative w-full max-w-[1000px] mx-auto rounded-3xl border border-white/20 shadow-2xl shadow-black/10 transform rotate-x-2"
            />
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative py-20 border-y border-gray-100 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-md z-10">
        <div className="container max-w-7xl mx-auto px-6">
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center"
          >
            <motion.div variants={fadeUp} className="space-y-2">
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-accent-green to-accent-blue">3</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">ML Models Trained</p>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-2">
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-accent-blue to-accent-leaf">6+</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Integrated Views</p>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-2">
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-accent-leaf to-accent-teal">Real-time</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Team Collaboration</p>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-2">
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-accent-teal to-accent-green">95%</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">SetFit Accuracy</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative z-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <span className="text-accent-green font-bold tracking-[0.2em] uppercase text-xs">Core Features</span>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">Everything Your Team Needs</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xl mx-auto">From Kanban boards to AI insights — one platform to manage it all.</p>
          </div>
          
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                variants={fadeUp}
                className="group p-10 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[2.5rem] hover:translate-y-[-10px] hover:shadow-2xl hover:shadow-accent-green/5 transition-all duration-500"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Showcase */}
      <section id="ai" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="flex items-center gap-3 text-accent-green">
                <Sparkles size={20} />
                <span className="font-bold uppercase tracking-widest text-sm">AI-Powered Engine</span>
              </div>
              <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight">
                Smart Recommendations <br /> That Actually Work
              </h3>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Our ML pipeline uses fine-tuned SetFit models for priority prediction, TF-IDF skill matching, and heuristic wellness scoring — all running in real-time.
              </p>
              <ul className="space-y-4">
                {[
                  "Critical task priority detection with 95% accuracy",
                  "Skill-based task-to-member matching",
                  "Proactive burnout and overload alerts",
                  "Company-size adaptive thresholds"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-gray-600 dark:text-gray-300 font-medium">
                    <CheckCircle2 className="text-accent-leaf" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-accent-green/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <img 
                src="/ai-showcase.png" 
                alt="AI Feature Showcase" 
                className="relative rounded-[2.5rem] border border-white/20 shadow-2xl z-20"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Collaboration Showcase */}
      <section id="collaboration" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 relative group"
            >
              <div className="absolute inset-0 bg-accent-leaf/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-full aspect-video rounded-[2.5rem] border border-white/20 shadow-2xl z-20 overflow-hidden">
                <img 
                  src="/team-collaboration.png" 
                  alt="Team Collaboration Mockup" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2 space-y-8"
            >
              <div className="flex items-center gap-3 text-accent-leaf">
                <Users size={20} />
                <span className="font-bold uppercase tracking-widest text-sm">Team Collaboration</span>
              </div>
              <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight">
                Work Together, Seamlessly
              </h3>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                From real-time chat to shared whiteboards — everything your team needs to collaborate effectively, built right into your workflow.
              </p>
              <ul className="space-y-4">
                {[
                  "Integrated chat with thread support",
                  "Intelligent skill-based assignment",
                  "Shared pages and context-rich tasks",
                  "Time tracking with live indicators"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-gray-600 dark:text-gray-300 font-medium">
                    <CheckCircle2 className="text-accent-leaf" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="space-y-4 mb-20">
            <span className="text-accent-green font-bold tracking-[0.2em] uppercase text-xs">Built With</span>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">Modern Tech Stack</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xl mx-auto">Enterprise-grade technologies powering a seamless experience.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {techStack.map((tech, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-3"
              >
                <div className={`${tech.color} w-10 h-10`}>{tech.icon}</div>
                <span className="font-bold text-gray-900 dark:text-white">{tech.name}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tech.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="p-12 md:p-20 bg-white/80 dark:bg-[#0a0a0a] backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-12"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
              <Github size={50} />
            </div>
            <div className="flex-1 space-y-6 text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter text-balance">Proudly Open Source</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                TaskFlow is fully open source under the MIT license. Explore the codebase, contribute features, reported issues, or fork it to build your own version.
              </p>
              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                <a href="https://github.com/AndrewJerryV/TaskFlow-Mini_Project" target="_blank" className="px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center gap-3 hover:translate-y-[-2px] transition-all">
                  <Github size={20} />
                  View on GitHub
                </a>
                <div className="flex gap-2">
                  <span className="px-4 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full text-xs font-bold text-gray-500">MIT License</span>
                  <span className="px-4 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full text-xs font-bold text-gray-500">Next.js + Python</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="p-20 bg-gradient-to-br from-accent-green/10 to-accent-leaf/5 border border-accent-green/20 rounded-[4rem] text-center space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-radial-gradient from-accent-green/5 to-transparent pointer-events-none"></div>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-green to-accent-leaf">Transform</span> Your Workflow?</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-xl mx-auto">Join teams using AI to ship faster, stay healthier, and manage smarter.</p>
            <Link 
              href="/login"
              className="inline-flex items-center gap-4 px-12 py-6 bg-gradient-to-r from-accent-green to-[#9d7dff] text-white rounded-3xl font-bold text-xl hover:translate-y-[-3px] hover:shadow-2xl hover:shadow-accent-green/30 transition-all"
            >
              Get Started for Free
              <ArrowRight size={24} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100 dark:border-white/5 text-center">
        <div className="container max-w-7xl mx-auto px-6">
          <p className="text-gray-400 font-bold flex items-center justify-center gap-2">
            © 2026 TaskFlow. Built with <Heart size={16} className="text-accent-teal fill-accent-teal" /> using Next.js, Supabase & Machine Learning.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: <Layout size={28} />,
    title: "Kanban Task Board",
    description: "Drag-and-drop task management with customizable columns, priority tags, and real-time status tracking.",
    color: "from-accent-green to-[#9d7dff]"
  },
  {
    icon: <Sparkles size={28} />,
    title: "ML Recommendations",
    description: "SetFit-powered priority classification and skill-based task assignment that learns from team patterns.",
    color: "from-accent-leaf to-accent-teal"
  },
  {
    icon: <Activity size={28} />,
    title: "Bottleneck Detection",
    description: "Automatic identification of workflow blockers and aging tasks with actionable rebalancing suggestions.",
    color: "from-accent-teal to-[#ff7eb3]"
  },
  {
    icon: <MessageSquare size={28} />,
    title: "Real-time Chat",
    description: "Built-in team messaging with threads and mentions — keep conversations contextual and next to your work.",
    color: "from-accent-blue to-[#1e90ff]"
  },
  {
    icon: <Heart size={28} />,
    title: "Wellness Monitoring",
    description: "AI-driven burnout detection tracks workload distribution and overtime patterns to keep teams healthy.",
    color: "from-accent-leaf to-[#a8ff78]"
  },
  {
    icon: <BarChart3 size={28} />,
    title: "Reports & Analytics",
    description: "Interactive charts, velocity tracking, and sprint burndowns that give leadership full project visibility.",
    color: "from-accent-green to-accent-teal"
  }
];

const techStack = [
  { icon: <Zap />, name: "Next.js", desc: "React Framework", color: "text-accent-blue" },
  { icon: <Layout />, name: "Tailwind", desc: "Utility Styling", color: "text-accent-teal" },
  { icon: <Activity />, name: "Supabase", desc: "DB & Auth", color: "text-accent-leaf" },
  { icon: <Sparkles />, name: "SetFit", desc: "ML Models", color: "text-accent-green" },
  { icon: <MousePointer2 />, name: "Python", desc: "ML Backend", color: "text-accent-leaf" },
  { icon: <ArrowRight />, name: "Framer", desc: "Animations", color: "text-accent-teal" },
];