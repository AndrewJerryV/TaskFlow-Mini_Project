'use client';

import React, { useState, useEffect } from 'react';
import { Task, User } from '@/types';
import { AlertTriangle, Activity, Users, CheckCircle2, Loader2, Zap } from 'lucide-react';

interface BottleneckAlertProps {
    tasks?: Task[];
    users?: User[];
}

interface BottleneckResult {
    type: 'person' | 'process';
    location: string;
    taskCount: number;
    avgDaysStuck: number;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
}

export function BottleneckAlert({ tasks = [], users = [] }: BottleneckAlertProps) {
    const [bottlenecks, setBottlenecks] = useState<BottleneckResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [mlPowered, setMlPowered] = useState(false);
    const [healthScore, setHealthScore] = useState<number | null>(null);
    const [healthSummary, setHealthSummary] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBottlenecks() {
            setLoading(true);

            try {
                const res = await fetch('/api/analytics/bottlenecks');
                if (!res.ok) throw new Error('Failed to fetch');

                const data = await res.json();
                setBottlenecks(data.bottlenecks || []);
                setMlPowered(data.mlPowered || false);
                setHealthScore(data.overallHealthScore ?? null);
                setHealthSummary(data.healthSummary ?? null);
            } catch (err) {
                console.error('Failed to fetch bottlenecks:', err);
                // strictly rely on API, no local fallback to heuristics
                setBottlenecks([]);
            } finally {
                setLoading(false);
            }
        }

        fetchBottlenecks();
    }, [tasks.length, users.length]);

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
                    {mlPowered && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                            <Zap size={10} />
                            ML Insights
                        </span>
                    )}
                    {healthScore !== null && (
                        <span className={`text-sm font-semibold ${getHealthColor(healthScore)}`}>
                            {healthScore}/100
                        </span>
                    )}
                </div>
            </div>

            {healthSummary && mlPowered && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 italic px-1">
                    💡 {healthSummary}
                </p>
            )}

            {bottlenecks.length === 0 ? (
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
                                        <span className="opacity-50">•</span>
                                        <span className="text-xs font-medium">{bottleneck.location}</span>
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
