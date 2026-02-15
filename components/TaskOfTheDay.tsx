'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Clock, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Task } from '@/types';

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
    const [data, setData] = useState<RecommendationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        fetch(`/api/ml/recommendation?userId=${userId}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-white/20 rounded w-1/3" />
                    <div className="h-8 bg-white/20 rounded w-2/3" />
                </div>
            </div>
        );
    }

    if (!data || !data.taskOfTheDay) {
        return (
            <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
                <div className="flex items-center gap-3">
                    <CheckCircle size={24} />
                    <div>
                        <h3 className="font-semibold">All caught up!</h3>
                        <p className="text-sm text-white/80">No open tasks. Time to relax or pick up new work.</p>
                    </div>
                </div>
            </div>
        );
    }

    const task = data.taskOfTheDay;
    const isOverdue = data.reason.includes('overdue');

    return (
        <div className={`p-6 rounded-xl text-white ${isOverdue
                ? 'bg-gradient-to-br from-red-500 to-orange-600'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                    <Sparkles size={16} />
                    AI Recommended • Task of the Day
                </div>
                {isOverdue && (
                    <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                        <AlertTriangle size={12} />
                        Overdue
                    </span>
                )}
            </div>

            <h3 className="text-xl font-bold mb-2">{task.title}</h3>

            <div className="flex items-center gap-4 text-sm text-white/80 mb-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.priority === 'Critical' ? 'bg-red-500/30' :
                        task.priority === 'High' ? 'bg-orange-500/30' :
                            task.priority === 'Medium' ? 'bg-yellow-500/30' : 'bg-green-500/30'
                    }`}>
                    {task.priority}
                </span>
                <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {task.status}
                </span>
                {task.dueDate && (
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                )}
            </div>

            <p className="text-sm text-white/70 mb-4">{data.reason}</p>

            <button
                onClick={() => onTaskClick?.(task)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
                Start Working
                <ArrowRight size={16} />
            </button>

            {data.totalOpenTasks && data.totalOpenTasks > 1 && (
                <p className="text-xs text-white/60 mt-4">
                    +{data.totalOpenTasks - 1} more task{data.totalOpenTasks > 2 ? 's' : ''} in your queue
                </p>
            )}
        </div>
    );
}
