'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Clock, ArrowRight, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Task } from '@/types';
import { useTimer } from '@/contexts/TimerContext';
import { apiFetch } from '@/lib/api/fetchWithSupabase';

interface RecommendationData {
    taskOfTheDay: Task | null;
    reason: string;
    score?: number;
    totalOpenTasks?: number;
}

interface TaskOfTheDayProps {
    userId: string;
    onTaskClick?: (task: Task) => void;
}

export function TaskOfTheDay({ userId, onTaskClick }: TaskOfTheDayProps) {
    const router = useRouter();
    const timer = useTimer();
    const [data, setData] = useState<RecommendationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (!userId) return;

        apiFetch(`/api/ml/recommendations?mode=task-of-the-day&userId=${userId}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
            </div>
        );
    }

    if (!data || !data.taskOfTheDay) {
        return (
            <div className="p-4 bg-emerald-50 dark:bg-slate-900/40 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                    <div>
                        <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">All caught up!</h3>
                        <p className="text-xs text-emerald-700 dark:text-slate-400">No open tasks. Time to relax or pick up new work.</p>
                    </div>
                </div>
            </div>
        );
    }

    const task = data.taskOfTheDay;
    const isOverdue = data.reason.includes('overdue');

    const handleStartWorking = async () => {
        if (!task || starting) return;
        setStarting(true);

        try {
            // 1. Start timer using the TimerProvider to ensure global sync
            await timer.startTimer(task);

            // 2. Trigger callback if provided
            onTaskClick?.(task);

            // 3. Navigate to project with Time Tracking tab active
            router.push(`/projects/${task.projectId}?tab=time%20tracking`);
        } catch (error) {
            console.error('Error starting work:', error);
            // Navigate anyway as the user wants to work on this
            router.push(`/projects/${task.projectId}`);
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className={`rounded-xl transition-all duration-300 ${isOverdue
                ? 'bg-red-50 dark:bg-slate-900/40 border-red-200 dark:border-red-500/30'
                : 'bg-indigo-50 dark:bg-slate-900/40 border-indigo-200 dark:border-indigo-500/30'
            } border overflow-hidden`}>
            
            {/* Header - Always Visible */}
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-colors"
            >
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                    Task of the Day
                </div>
                <div className="flex items-center gap-2">
                    {isOverdue && isCollapsed && (
                        <span className="flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-500/30 font-semibold">
                            <AlertTriangle size={10} />
                            Overdue
                        </span>
                    )}
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                </div>
            </button>

            {!isCollapsed && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">{task.title}</h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${task.priority === 'Critical' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30' :
                                task.priority === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30' :
                                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30' : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'
                            }`}>
                            {task.priority}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {task.status}
                        </span>
                        {task.dueDate && (
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{data.reason}</p>

                    <button
                        onClick={handleStartWorking}
                        disabled={starting}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-all duration-200 text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95"
                    >
                        {starting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                Start Working
                                <ArrowRight size={14} />
                            </>
                        )}
                    </button>


                </div>
            )}
        </div>
    );
}
