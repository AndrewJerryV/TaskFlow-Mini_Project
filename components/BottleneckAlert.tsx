'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, User, GitBranch, ArrowRight, BarChart3, Sparkles } from 'lucide-react';
import { Task, User as UserType } from '@/types';
import { getUserName } from '@/lib/utils';

interface BottleneckAlertProps {
    tasks: Task[];
    users: UserType[];
}

interface Bottleneck {
    type: 'person' | 'process';
    location: string;
    taskCount: number;
    avgDaysStuck: number;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
}

export function BottleneckAlert({ tasks, users }: BottleneckAlertProps) {
    const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
    const [stats, setStats] = useState({ process: 0, person: 0 });

    useEffect(() => {
        const analyze = () => {
            const newBottlenecks: Bottleneck[] = [];

            // 1. Process Bottlenecks (Status columns)
            const statusCounts: Record<string, Task[]> = {
                'To Do': [],
                'In Progress': [],
                'Review': [],
                'Done': []
            };

            tasks.forEach(t => {
                if (statusCounts[t.status]) statusCounts[t.status].push(t);
            });

            // Analyze "In Progress" pile-up
            const inProgress = statusCounts['In Progress'];
            if (inProgress.length > 5) { // Threshold for pile-up
                const avgAge = inProgress.reduce((acc, t) => {
                    const days = (new Date().getTime() - new Date(t.updatedAt).getTime()) / (1000 * 3600 * 24);
                    return acc + days;
                }, 0) / inProgress.length;

                if (avgAge > 3) {
                    newBottlenecks.push({
                        type: 'process',
                        location: 'In Progress Column',
                        taskCount: inProgress.length,
                        avgDaysStuck: Math.round(avgAge),
                        recommendation: 'Break down complex tasks or add more resources to active development.',
                        severity: inProgress.length > 8 ? 'high' : 'medium'
                    });
                }
            }

            // Analyze "Review" pile-up
            const review = statusCounts['Review'];
            if (review.length > 3) {
                const avgAge = review.reduce((acc, t) => {
                    const days = (new Date().getTime() - new Date(t.updatedAt).getTime()) / (1000 * 3600 * 24);
                    return acc + days;
                }, 0) / review.length;

                if (avgAge > 2) {
                    newBottlenecks.push({
                        type: 'process',
                        location: 'Code Review',
                        taskCount: review.length,
                        avgDaysStuck: Math.round(avgAge),
                        recommendation: 'Schedule a dedicated code review session to clear the queue.',
                        severity: avgAge > 4 ? 'high' : 'medium'
                    });
                }
            }

            // 2. Person Bottlenecks (Overloaded users)
            const userTaskCounts: Record<string, number> = {};
            tasks.filter(t => t.status === 'In Progress' || t.status === 'Review').forEach(t => {
                const assignee = t.assigneeId || 'unassigned';
                userTaskCounts[assignee] = (userTaskCounts[assignee] || 0) + 1;
            });

            Object.entries(userTaskCounts).forEach(([userId, count]) => {
                if (count > 4) { // Threshold for overload
                    const userName = getUserName(users, userId);
                    newBottlenecks.push({
                        type: 'person',
                        location: userName,
                        taskCount: count,
                        avgDaysStuck: 0, // Not calculated for person yet
                        recommendation: `Redistribute tasks from ${userName} to balance workload.`,
                        severity: count > 6 ? 'high' : 'medium'
                    });
                }
            });

            setBottlenecks(newBottlenecks);
            setStats({
                process: newBottlenecks.filter(b => b.type === 'process').length,
                person: newBottlenecks.filter(b => b.type === 'person').length
            });
        };

        analyze();
    }, [tasks, users]);

    if (bottlenecks.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <BarChart3 size={18} className="text-green-600 dark:text-green-400" />
                        Workflow Health
                    </h2>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full mb-3">
                        <Sparkles size={24} className="text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Workflow is Healthy</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                        No bottlenecks detected. Task flow in "In Progress" and "Review" follows optimal velocity.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <BarChart3 size={18} className="text-orange-600 dark:text-orange-400" />
                    Workflow Bottlenecks
                </h2>
                <div className="flex gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><GitBranch size={12} /> {stats.process} Process</span>
                    <span className="flex items-center gap-1"><User size={12} /> {stats.person} People</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bottlenecks.map((bottleneck, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-lg border flex flex-col justify-between ${bottleneck.severity === 'high'
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                            }`}
                    >
                        <div>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-md ${bottleneck.type === 'process'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        }`}>
                                        {bottleneck.type === 'process' ? <GitBranch size={16} /> : <User size={16} />}
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{bottleneck.location}</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bottleneck.severity === 'high'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                                    }`}>
                                    {bottleneck.severity.toUpperCase()}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3 ml-1">
                                <span>{bottleneck.taskCount} items piled up</span>
                                {bottleneck.avgDaysStuck > 0 && (
                                    <>
                                        <span>•</span>
                                        <span>~{bottleneck.avgDaysStuck}d avg age</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/40 p-2 rounded">
                            <ArrowRight size={14} className="mt-1 flex-shrink-0 opacity-70" />
                            <span>{bottleneck.recommendation}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
