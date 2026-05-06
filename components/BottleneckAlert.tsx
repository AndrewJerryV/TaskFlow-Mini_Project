'use client';

import React, { useState, useEffect } from 'react';
import { Task, User } from '@/types';
import { AlertTriangle, Activity, Users, CheckCircle2, Loader2, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';

interface BottleneckAlertProps {
    tasks?: Task[];
    users?: User[];
    currentUser?: User | null;
    projectId?: string | null;
}

interface BottleneckResult {
    type: 'person' | 'process';
    location: string;
    taskCount: number;
    avgDaysStuck: number;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
    projectId?: string;
    taskIds?: string[];
}

interface RebalanceSuggestion {
    taskId: string;
    taskTitle: string;
    taskPriority: string;
    fromUser: { id: string; name: string; wellness: number };
    toUser: {
        id: string;
        name: string;
        skillMatch: number;
        wellness: number;
        wellnessStatus: string;
        matchingSkills: string[];
    };
    requiredSkills: string[];
}

export function BottleneckAlert({ tasks = [], users = [], currentUser = null, projectId = null }: BottleneckAlertProps) {
    const [bottlenecks, setBottlenecks] = useState<BottleneckResult[]>([]);
    const [projectGroup, setProjectGroup] = useState<{
        projectId: string;
        projectName: string;
        bottlenecks: BottleneckResult[];
        overdueTasks: { id: string; title: string; status: string; dueDate: string; daysOverdue: number }[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [mlPowered, setMlPowered] = useState(false);
    const [healthScore, setHealthScore] = useState<number | null>(null);
    const [healthSummary, setHealthSummary] = useState<string | null>(null);
    const [rebalanceSuggestions, setRebalanceSuggestions] = useState<RebalanceSuggestion[]>([]);

    const router = useRouter();
    const [applyingSwap, setApplyingSwap] = useState<string | null>(null);
    const [appliedSwaps, setAppliedSwaps] = useState<Set<string>>(new Set());

    const handleApplySwap = async (suggestion: RebalanceSuggestion) => {
        if (!currentUser?.id) return;
        setApplyingSwap(suggestion.taskId);
        try {
            const updatedTask = await db.updateTask(suggestion.taskId, {
                assigneeId: suggestion.toUser.id,
            }, currentUser.id);
            if (updatedTask) {
                setAppliedSwaps(prev => new Set([...prev, suggestion.taskId]));
                router.refresh();
            }
        } catch (err) {
            console.error('Failed to apply swap:', err);
        } finally {
            setApplyingSwap(null);
        }
    };

    const deps = [tasks.length, users.length, currentUser?.id ?? null, projectId ?? null];

    useEffect(() => {
        async function fetchBottlenecks() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (currentUser?.id) params.set('userId', currentUser.id);
                if (projectId) params.set('projectId', projectId);
                const res = await fetch(`/api/analytics/bottlenecks?${params.toString()}`);
                const data = await res.json();

                setBottlenecks(data.bottlenecks || []);
                const groups = data.projects || [];
                setProjectGroup(groups.length > 0 ? groups[0] : null);
                setMlPowered(data.mlPowered || false);
                setHealthScore(data.overallHealthScore ?? null);
                setHealthSummary(data.healthSummary ?? null);
                setRebalanceSuggestions(data.rebalanceSuggestions || []);
            } catch (err) {
                console.error('Failed to fetch bottlenecks:', err);
                setBottlenecks([]);
                setProjectGroup(null);
            } finally {
                setLoading(false);
            }
        }
        fetchBottlenecks();
    }, deps);

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                Analyzing workflow health...
            </div>
        );
    }

    const severityColor = {
        high: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
        medium: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300',
        low: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
    };

    const severityDot = {
        high: 'bg-red-500',
        medium: 'bg-orange-500',
        low: 'bg-yellow-500'
    };

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };



    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            case 'High': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
            case 'Medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            default: return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
        }
    };

    const renderBottleneckCard = (bottleneck: BottleneckResult, key: string | number) => (
        <div key={key} className={`p-3 rounded-lg border ${severityColor[bottleneck.severity]} transition-all`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                    {bottleneck.type === 'process' ? (
                        <AlertTriangle size={16} />
                    ) : (
                        <Users size={16} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${severityDot[bottleneck.severity]}`} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {bottleneck.type} bottleneck
                        </span>
                        {bottleneck.type !== 'process' && (
                            <>
                                <span className="opacity-50">•</span>
                                <span className="text-xs font-medium">{bottleneck.location}</span>
                            </>
                        )}
                    </div>
                    <p className="text-sm leading-relaxed">{bottleneck.recommendation}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-3" style={{ minWidth: 0 }}>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Workflow Health
                </h3>
                <div className="flex items-center gap-2">
                    {healthScore !== null && (
                        <span className={`text-sm font-semibold ${getHealthColor(healthScore)}`}>
                            {healthScore}/100
                        </span>
                    )}
                </div>
            </div>

            {healthSummary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic px-1">
                    {healthSummary}
                </p>
            )}

            {projectGroup ? (
                <div className="space-y-3">
                    {projectGroup.bottlenecks.length === 0 && projectGroup.overdueTasks.length === 0 ? (
                        <div className="text-xs text-gray-500">No bottlenecks or overdue tasks.</div>
                    ) : (
                        <div className="space-y-3">
                            {projectGroup.bottlenecks.map((bottleneck, idx) => (
                                renderBottleneckCard(bottleneck, `${projectGroup.projectId}-b-${idx}`)
                            ))}
                        </div>
                    )}
                </div>
            ) : bottlenecks.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">No bottlenecks detected</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Workflow is running smoothly.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {bottlenecks.map((bottleneck, idx) => (
                        renderBottleneckCard(bottleneck, idx)
                    ))}
                </div>
            )}

            {/* AI Rebalancing Suggestions */}
            {rebalanceSuggestions.length > 0 && (
                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 pb-1">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Heart size={14} className="text-pink-500" />
                            AI Rebalancing Suggestions
                        </h4>
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                            <Sparkles size={8} /> AI Powered
                        </span>
                    </div>

                    {rebalanceSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/40 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                    <ArrowRight size={16} className="text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPriorityColor(suggestion.taskPriority)}`}>
                                            {suggestion.taskPriority}
                                        </span>
                                        <button
                                            onClick={() => router.push(`/projects/${projectId}?tab=Backlog&task=${suggestion.taskId}`)}
                                            className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors text-left"
                                        >
                                            {suggestion.taskTitle}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-semibold">{suggestion.fromUser.name} <span className={`font-normal text-[10px] ${getHealthColor(suggestion.fromUser.wellness)}`}>(Wellness: {Math.round(suggestion.fromUser.wellness)})</span></span>
                                        <ArrowRight size={10} className="text-gray-400" />
                                        <span className="font-semibold">{suggestion.toUser.name} <span className={`font-normal text-[10px] ${getHealthColor(suggestion.toUser.wellness)}`}>(Wellness: {Math.round(suggestion.toUser.wellness)})</span></span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 mt-2 bg-white/50 dark:bg-black/20 rounded-md px-2 py-1 fit-content border border-indigo-100/50 dark:border-indigo-800/20 inline-flex">
                                        <Sparkles size={10} className="text-indigo-400" />
                                        <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                            <span className="font-medium text-indigo-600 dark:text-indigo-400">{suggestion.toUser.skillMatch}% skill match</span> 
                                            {suggestion.toUser.matchingSkills.length > 0 && ` • ${suggestion.toUser.matchingSkills.join(', ')}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-end">
                                    {appliedSwaps.has(suggestion.taskId) ? (
                                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={12} /> Applied
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleApplySwap(suggestion)}
                                            disabled={applyingSwap === suggestion.taskId}
                                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 transition-colors"
                                        >
                                            {applyingSwap === suggestion.taskId ? (
                                                <><Loader2 size={10} className="animate-spin" /> Applying…</>
                                            ) : (
                                                <><CheckCircle2 size={10} /> Apply Swap</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
