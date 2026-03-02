'use client';

import React, { useState, useEffect } from 'react';
import { checkMLStatus, testPriority, testUrgency, testSkillMatch } from './actions';
import { BrainCircuit, CheckCircle, AlertTriangle, Play, RefreshCw, Zap, Server } from 'lucide-react';

export default function MLDebugPage() {
    const [mlAvailable, setMlAvailable] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<'priority' | 'urgency' | 'skills'>('priority');

    useEffect(() => {
        checkMLStatus().then(res => setMlAvailable(res.available));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <BrainCircuit className="text-indigo-600" />
                            ML Model Debug & Verification
                        </h1>
                        <p className="text-gray-500 mt-1">Test local models in real-time with custom inputs.</p>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${mlAvailable ? 'bg-green-50 border-green-200 text-green-700' : mlAvailable === false ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {mlAvailable === null ? (
                            <RefreshCw className="animate-spin w-4 h-4" />
                        ) : mlAvailable ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        <span className="font-medium text-sm">
                            {mlAvailable === null ? 'Checking Models...' : mlAvailable ? 'Models Loaded based on JSON' : 'Models NOT Loaded'}
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                    {['priority', 'urgency', 'skills'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)} Test
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[400px]">
                    {activeTab === 'priority' && <PriorityTester />}
                    {activeTab === 'urgency' && <UrgencyTester />}
                    {activeTab === 'skills' && <SkillTester />}
                </div>

            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Priority Tester Component
// ----------------------------------------------------------------------

function PriorityTester() {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        const res = await testPriority(title, desc);
        setResult(res);
        setLoading(false);
    };

    const loadExample = (t: string, d: string) => {
        setTitle(t);
        setDesc(d);
        setResult(null);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Server className="w-4 h-4 text-gray-400" />
                    Input parameters
                </h3>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title</label>
                    <input
                        value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. Server down"
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                        value={desc} onChange={e => setDesc(e.target.value)}
                        className="w-full p-2 border rounded-md h-32 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Detailed description..."
                    />
                </div>

                <div className="pt-2 flex gap-2">
                    <button onClick={runTest} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
                        {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                        Run Classification
                    </button>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Load Examples</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => loadExample('Fix critical security vulnerability', 'SQL Injection found in login endpoint')} className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-200">
                            Critical Security
                        </button>
                        <button onClick={() => loadExample('Update footer copyright', 'Change year to 2026')} className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-200">
                            Low Priority UI
                        </button>
                        <button onClick={() => loadExample('Server memory leak', 'Crashing every 30 mins')} className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-200">
                            High Priority Ops
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Model Output
                </h3>

                {result ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <span className="text-xs text-gray-500 block">Predicted Class</span>
                                <span className={`text-xl font-bold ${result.prediction === 'Critical' ? 'text-red-600' : result.prediction === 'High' ? 'text-orange-600' : 'text-blue-600'}`}>
                                    {result.prediction || 'Unknown'}
                                </span>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <span className="text-xs text-gray-500 block">Inference Time</span>
                                <span className="text-xl font-mono">{result.timeMs}ms</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-4">
                            Model: {result.usedModel}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Run classification to see results
                    </div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Urgency Tester Component
// ----------------------------------------------------------------------

function UrgencyTester() {
    // Default values matching mock task
    const [features, setFeatures] = useState({
        priority: 'High',
        status: 'To Do',
        daysUntilDue: 2,
        hasDueDate: true,
        daysSinceUpdate: 0,
        createdDaysAgo: 5
    });

    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        const res = await testUrgency(features);
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium block">Priority</label>
                        <select
                            className="w-full p-2 border rounded text-sm"
                            value={features.priority}
                            onChange={e => setFeatures({ ...features, priority: e.target.value })}
                        >
                            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium block">Status</label>
                        <select
                            className="w-full p-2 border rounded text-sm"
                            value={features.status}
                            onChange={e => setFeatures({ ...features, status: e.target.value })}
                        >
                            <option>To Do</option><option>In Progress</option><option>Done</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium block">Days Until Due</label>
                        <input type="number" className="w-full p-2 border rounded text-sm"
                            value={features.daysUntilDue}
                            onChange={e => setFeatures({ ...features, daysUntilDue: parseInt(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium block">Days Since Update</label>
                        <input type="number" className="w-full p-2 border rounded text-sm"
                            value={features.daysSinceUpdate}
                            onChange={e => setFeatures({ ...features, daysSinceUpdate: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button onClick={runTest} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
                        {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                        Score Urgency
                    </button>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Example Scenarios</p>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => setFeatures({ priority: 'Critical', status: 'To Do', daysUntilDue: -2, hasDueDate: true, daysSinceUpdate: 10, createdDaysAgo: 20 })} className="text-xs text-left bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded hover:bg-red-100 border border-red-100 dark:border-red-900">
                            <b>Overdue Critical Task (High Urgency)</b><br />
                            Critical | Overdue by 2 days | Stale (10 days)
                        </button>

                        <button onClick={() => setFeatures({ priority: 'Low', status: 'To Do', daysUntilDue: 30, hasDueDate: true, daysSinceUpdate: 0, createdDaysAgo: 1 })} className="text-xs text-left bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded hover:bg-green-100 border border-green-100 dark:border-green-900">
                            <b>Chill Task (Low Urgency)</b><br />
                            Low | Due in 30 days | Just updated
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Model Output
                </h3>

                {result ? (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-center p-6">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        strokeDasharray={377}
                                        strokeDashoffset={377 - (377 * result.score) / 100}
                                        className={`${result.score > 70 ? 'text-red-500' : result.score > 40 ? 'text-yellow-500' : 'text-green-500'} transition-all duration-1000 ease-out`}
                                    />
                                </svg>
                                <span className="absolute text-3xl font-bold">{result.score}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-xs text-gray-500 block">Inference: {result.timeMs}ms</span>
                            <span className="text-xs text-gray-400 font-mono">Model: {result.usedModel}</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Run scoring to see results</div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Skill Tester Component
// ----------------------------------------------------------------------

function SkillTester() {
    const [taskText, setTaskText] = useState('Build a React component using Hooks');
    const [skills, setSkills] = useState('React, JavaScript, CSS');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        const skillsArray = skills.split(',').map(s => s.trim());
        const res = await testSkillMatch(taskText, skillsArray);
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="space-y-3">
                    <label className="block text-sm font-medium">Task Text</label>
                    <textarea
                        value={taskText} onChange={e => setTaskText(e.target.value)}
                        className="w-full p-2 border rounded-md h-24 text-sm"
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium">User Skills (comma separated)</label>
                    <input
                        value={skills} onChange={e => setSkills(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                    />
                </div>

                <button onClick={runTest} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
                    {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                    Calculate Match
                </button>

                <div className="pt-4 border-t border-gray-100">
                    <div className="flex flex-col gap-2">
                        <button onClick={() => { setTaskText('Build a machine learning pipeline in Python'); setSkills('Python, Data Science, Pandas, ML'); }} className="text-xs text-left bg-gray-100 px-3 py-2 rounded hover:bg-gray-200">
                            <b>Perfect Match Example</b>
                        </button>
                        <button onClick={() => { setTaskText('Design a logo in Figma'); setSkills('Python, SQL, Java'); }} className="text-xs text-left bg-gray-100 px-3 py-2 rounded hover:bg-gray-200">
                            <b>No Match Example</b>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
                {result ? (
                    <div className="text-center space-y-4 animate-in zoom-in-95">
                        <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">
                            {result.score}%
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Semantic Similarity Score</p>

                        <div className="flex gap-4 text-xs text-gray-400 font-mono mt-4">
                            <span>Time: {result.timeMs}ms</span>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-800 rounded text-xs text-left w-full">
                            <p><b>Logic:</b> TF-IDF Vectorization followed by Cosine Similarity.</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 text-sm">Run match to see score</div>
                )}
            </div>
        </div>
    );
}
