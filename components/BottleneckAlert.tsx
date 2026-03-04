'use client';

import React, { useState, useEffect } from 'react';
import { Task, User } from '@/types';
import { AlertTriangle, Activity, Users, CheckCircle2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface BottleneckAlertProps {
    tasks?: Task[];
    users?: User[];
    currentUser?: User | null;
}

interface BottleneckResult {
    type: 'person' | 'process';
    location: string;
    taskCount: number;
    avgDaysStuck: number;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
    projectId?: string;
}

interface ProjectGroup {
    projectId: string;
    projectName: string;
    bottlenecks: BottleneckResult[];
    overdueTasks: { id: string; title: string; status: string; dueDate: string; daysOverdue: number }[];
}

export function BottleneckAlert({ tasks = [], users = [], currentUser = null }: BottleneckAlertProps) {
    const [bottlenecks, setBottlenecks] = useState<BottleneckResult[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [mlPowered, setMlPowered] = useState(false);
    const [healthScore, setHealthScore] = useState<number | null>(null);
    const [healthSummary, setHealthSummary] = useState<string | null>(null);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        async function fetchBottlenecks() {
            setLoading(true);
            setUnavailable(false);
            try {
                const params = new URLSearchParams();
                if (currentUser?.id) params.set('userId', currentUser.id);
                const res = await fetch(`/api/analytics/bottlenecks?${params.toString()}`);
                const data = await res.json();
                // If API says unavailable or not ML powered, show a friendly message
                if (data.unavailable || data.mlPowered === false) {
                    setUnavailable(true);
                    setBottlenecks([]);
                    setProjectGroups([]);
                    setMlPowered(false);
                    setHealthScore(data.overallHealthScore ?? null);
                    setHealthSummary(data.healthSummary ?? null);
                    return;
                }
                setBottlenecks(data.bottlenecks || []);
                const groups = data.projects || [];
                setProjectGroups(groups);
                if (groups.length > 0) {
                    const nextState: Record<string, boolean> = {};
                    groups.forEach((g: ProjectGroup) => {
                        nextState[g.projectId] = true;
                    });
                    setCollapsedProjects(nextState);
                }
                setMlPowered(data.mlPowered || false);
                setHealthScore(data.overallHealthScore ?? null);
                setHealthSummary(data.healthSummary ?? null);
            } catch (err) {
                console.error('Failed to fetch bottlenecks:', err);
                setUnavailable(true);
                setBottlenecks([]);
                setProjectGroups([]);
            } finally {
                setLoading(false);
            }
        }
        fetchBottlenecks();
    }, [tasks.length, users.length, currentUser?.id]);

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                Analyzing workflow health...
            </div>
        );
    }
    if (unavailable) {
        return (
            <div className="p-6 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-500" />
                <span>AI-powered bottleneck detection is currently unavailable.</span>
                <span className="text-xs text-gray-400">Try again later or contact your admin.</span>
            </div>
        );
    }

    const severityColor = {
        high: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
        medium: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
        low: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
    };

    const severityDot = {
        high: 'bg-red-500',
        medium: 'bg-amber-500',
        low: 'bg-yellow-500'
    };

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="space-y-3">
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

            {healthSummary && mlPowered && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 italic px-1">
                    {healthSummary}
                </p>
            )}

            {projectGroups.length > 0 ? (
                <div className="space-y-4">
                    {projectGroups.map(group => (
                        <div key={group.projectId} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCollapsedProjects(prev => ({
                                            ...prev,
                                            [group.projectId]: !prev[group.projectId]
                                        }))
                                    }
                                    className="flex items-center gap-2 min-w-0 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                                    aria-expanded={!collapsedProjects[group.projectId]}
                                    aria-label={collapsedProjects[group.projectId] ? 'Expand project group' : 'Collapse project group'}
                                >
                                    {collapsedProjects[group.projectId] ? (
                                        <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
                                    ) : (
                                        <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                                    )}
                                    <h4 className="text-sm font-semibold truncate">
                                        {group.projectName}
                                    </h4>
                                </button>
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <span>{group.bottlenecks.length} bottlenecks</span>
                                    <span className="opacity-50">•</span>
                                    <span>{group.overdueTasks.length} overdue</span>
                                </div>
                            </div>

                            {collapsedProjects[group.projectId] ? null : group.bottlenecks.length === 0 && group.overdueTasks.length === 0 ? (
                                <div className="text-xs text-gray-500">No bottlenecks or overdue tasks.</div>
                            ) : (
                                <div className="space-y-3">
                                    {group.bottlenecks.map((bottleneck, idx) => (
                                        <div key={`${group.projectId}-b-${idx}`} className={`p-3 rounded-lg border ${severityColor[bottleneck.severity]} transition-all`}>
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
                                                    <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                                                        <span>{bottleneck.taskCount} tasks</span>
                                                        <span>Avg {bottleneck.avgDaysStuck} days stuck</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {group.overdueTasks.length > 0 && (
                                        <div className="p-3 rounded-lg border bg-red-50/40 dark:bg-red-900/10 border-red-200 dark:border-red-800 transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex-shrink-0">
                                                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                                                            Overdue Tasks
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 mt-1">
                                                        {group.overdueTasks.map(task => (
                                                            <div key={task.id} className="flex items-center justify-between text-sm text-red-700 dark:text-red-300">
                                                                <span className="truncate pr-3">{task.title}</span>
                                                                <span className="whitespace-nowrap text-xs">{task.daysOverdue}d overdue</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
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
                        <div key={idx} className={`p-3 rounded-lg border ${severityColor[bottleneck.severity]} transition-all`}>
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
                                    <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                                        <span>{bottleneck.taskCount} tasks</span>
                                        <span>Avg {bottleneck.avgDaysStuck} days stuck</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
