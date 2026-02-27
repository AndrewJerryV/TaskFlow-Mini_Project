'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, User, TrendingDown, Activity, Heart, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BurnoutMetrics {
    userId: string;
    name: string;
    email: string;
    taskCount: number;
    maxWorkload: number;
    capacityPercent: number;
    burnoutRisk: 'Low' | 'Medium' | 'High';
    wellnessScore: number;
}

export function BurnoutDashboard() {
    const [metrics, setMetrics] = useState<BurnoutMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') {
            fetch('/api/team/burnout')
                .then(res => res.json())
                .then(data => {
                    setMetrics(Array.isArray(data) ? data : []);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    if (loading) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Manager')) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
                <ShieldAlert size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Access Denied</h2>
                <p className="mt-2 text-center">You need Manager or Admin privileges to view burnout and wellness data.</p>
            </div>
        );
    }

    const highRisk = metrics.filter(m => m.burnoutRisk === 'High');
    const mediumRisk = metrics.filter(m => m.burnoutRisk === 'Medium');
    const avgCapacity = metrics.length > 0
        ? Math.round(metrics.reduce((sum, m) => sum + m.capacityPercent, 0) / metrics.length)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="text-purple-500" size={24} />
                    Team Burnout Monitor
                </h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="text-red-500" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{highRisk.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">High Risk</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                            <TrendingDown className="text-orange-500" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mediumRisk.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Medium Risk</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Heart className="text-blue-500" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgCapacity}%</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Capacity</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Banner */}
            {highRisk.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-500 mt-0.5" size={20} />
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-400">
                                {highRisk.length} team member{highRisk.length > 1 ? 's' : ''} at high burnout risk
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                {highRisk.map(m => m.name).join(', ')} - Consider redistributing workload
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Members Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Team Capacity Overview</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                                <th className="px-6 py-3 font-medium">Team Member</th>
                                <th className="px-6 py-3 font-medium">Active Tasks</th>
                                <th className="px-6 py-3 font-medium">Capacity</th>
                                <th className="px-6 py-3 font-medium">Wellness</th>
                                <th className="px-6 py-3 font-medium">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {metrics.map(member => (
                                <tr key={member.userId} className="text-sm">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                        {member.taskCount} / {member.maxWorkload}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${member.capacityPercent >= 100 ? 'bg-red-500' :
                                                        member.capacityPercent >= 80 ? 'bg-orange-500' :
                                                            member.capacityPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(member.capacityPercent, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-400 text-xs w-10">
                                                {member.capacityPercent}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Heart size={14} className={
                                                member.wellnessScore >= 70 ? 'text-green-500' :
                                                    member.wellnessScore >= 50 ? 'text-orange-500' : 'text-red-500'
                                            } />
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {member.wellnessScore}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.burnoutRisk === 'High'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            : member.burnoutRisk === 'Medium'
                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {member.burnoutRisk}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
