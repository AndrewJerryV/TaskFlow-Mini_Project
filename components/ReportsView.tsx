'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, CheckCircle, Clock, AlertTriangle, Download, Filter, Calendar } from 'lucide-react';
import { Task } from '@/types';

interface ReportsViewProps {
    projectId: string;
    tasks?: Task[];
}

interface MetricCard {
    title: string;
    value: string | number;
    change: number;
    icon: React.ReactNode;
    color: string;
}

export default function ReportsView({ projectId, tasks = [] }: ReportsViewProps) {
    const [timeRange, setTimeRange] = useState('month');
    const [reportType, setReportType] = useState('overview');
    const [projectTasks, setProjectTasks] = useState<Task[]>(tasks);

    // Fetch tasks if not provided
    useEffect(() => {
        if (tasks.length === 0) {
            fetch(`/api/tasks?projectId=${projectId}`)
                .then(res => res.json())
                .then(data => setProjectTasks(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [projectId, tasks]);

    // Calculate metrics
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
    const inProgressTasks = projectTasks.filter(t => t.status === 'In Progress').length;
    const todoTasks = projectTasks.filter(t => t.status === 'To Do').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const highPriorityTasks = projectTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
    const overdueTasks = projectTasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'Done';
    }).length;

    const metrics: MetricCard[] = [
        {
            title: 'Total Tasks',
            value: totalTasks,
            change: 12,
            icon: <BarChart3 size={20} />,
            color: 'bg-blue-500'
        },
        {
            title: 'Completed',
            value: completedTasks,
            change: 8,
            icon: <CheckCircle size={20} />,
            color: 'bg-green-500'
        },
        {
            title: 'In Progress',
            value: inProgressTasks,
            change: -2,
            icon: <Clock size={20} />,
            color: 'bg-yellow-500'
        },
        {
            title: 'Overdue',
            value: overdueTasks,
            change: 1,
            icon: <AlertTriangle size={20} />,
            color: 'bg-red-500'
        }
    ];

    // Status distribution for chart
    const statusDistribution = [
        { status: 'To Do', count: todoTasks, color: 'bg-gray-400' },
        { status: 'In Progress', count: inProgressTasks, color: 'bg-blue-500' },
        { status: 'Review', count: projectTasks.filter(t => t.status === 'Review').length, color: 'bg-purple-500' },
        { status: 'Done', count: completedTasks, color: 'bg-green-500' }
    ];

    // Priority distribution
    const priorityDistribution = [
        { priority: 'Critical', count: projectTasks.filter(t => t.priority === 'Critical').length, color: 'bg-red-600' },
        { priority: 'High', count: projectTasks.filter(t => t.priority === 'High').length, color: 'bg-orange-500' },
        { priority: 'Medium', count: projectTasks.filter(t => t.priority === 'Medium').length, color: 'bg-yellow-500' },
        { priority: 'Low', count: projectTasks.filter(t => t.priority === 'Low').length, color: 'bg-green-500' }
    ];

    // Weekly progress simulation
    const weeklyProgress = [
        { day: 'Mon', completed: 3, created: 5 },
        { day: 'Tue', completed: 5, created: 2 },
        { day: 'Wed', completed: 4, created: 4 },
        { day: 'Thu', completed: 6, created: 3 },
        { day: 'Fri', completed: 8, created: 6 },
        { day: 'Sat', completed: 2, created: 1 },
        { day: 'Sun', completed: 1, created: 0 }
    ];

    const maxWeeklyValue = Math.max(...weeklyProgress.flatMap(d => [d.completed, d.created]), 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="text-blue-500" size={24} />
                        Project Reports
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Analytics and insights for your project
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="week">Last 7 days</option>
                        <option value="month">Last 30 days</option>
                        <option value="quarter">Last 90 days</option>
                        <option value="year">Last year</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <Filter size={16} />
                        Filters
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 ${metric.color} rounded-lg flex items-center justify-center text-white`}>
                                {metric.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-sm ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {metric.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {Math.abs(metric.change)}%
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{metric.title}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Completion Rate */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Completion Rate</h3>
                    <div className="flex items-center justify-center">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r="40"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    className="text-gray-100 dark:text-gray-700"
                                />
                                <circle
                                    cx="50" cy="50" r="40"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${completionRate * 2.51} 251`}
                                    className="text-green-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{completionRate}%</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Complete</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{completedTasks}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tasks Done</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalTasks - completedTasks}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                        </div>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h3>
                    <div className="space-y-4">
                        {statusDistribution.map((item, idx) => (
                            <div key={idx}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.status}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full ${item.color} transition-all duration-500`}
                                        style={{ width: `${totalTasks > 0 ? (item.count / totalTasks) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Progress Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Weekly Progress</h3>
                    <div className="flex items-end justify-between h-48 gap-2">
                        {weeklyProgress.map((day, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex flex-col items-center gap-1 h-40 justify-end">
                                    <div
                                        className="w-full bg-green-500 rounded-t transition-all duration-500"
                                        style={{ height: `${(day.completed / maxWeeklyValue) * 100}%` }}
                                        title={`Completed: ${day.completed}`}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{day.day}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
                        </div>
                    </div>
                </div>

                {/* Priority Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Priority Breakdown</h3>
                    <div className="space-y-3">
                        {priorityDistribution.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{item.priority}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                                <span className="text-xs text-gray-400 w-12 text-right">
                                    {totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Mini bar chart */}
                    <div className="mt-4 flex rounded-lg overflow-hidden h-4">
                        {priorityDistribution.map((item, idx) => (
                            <div
                                key={idx}
                                className={`${item.color} transition-all duration-500`}
                                style={{ width: `${totalTasks > 0 ? (item.count / totalTasks) * 100 : 0}%` }}
                                title={`${item.priority}: ${item.count}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Team Performance (Simulated) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users size={20} className="text-blue-500" />
                    Team Performance
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <th className="pb-3 font-medium">Team Member</th>
                                <th className="pb-3 font-medium">Tasks Assigned</th>
                                <th className="pb-3 font-medium">Completed</th>
                                <th className="pb-3 font-medium">In Progress</th>
                                <th className="pb-3 font-medium">Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {[
                                { name: 'John Doe', assigned: 12, completed: 8, inProgress: 3 },
                                { name: 'Jane Smith', assigned: 15, completed: 12, inProgress: 2 },
                                { name: 'Bob Wilson', assigned: 8, completed: 5, inProgress: 2 },
                                { name: 'Alice Brown', assigned: 10, completed: 7, inProgress: 2 }
                            ].map((member, idx) => (
                                <tr key={idx} className="text-sm">
                                    <td className="py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {member.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-gray-600 dark:text-gray-400">{member.assigned}</td>
                                    <td className="py-3 text-green-600 dark:text-green-400">{member.completed}</td>
                                    <td className="py-3 text-blue-600 dark:text-blue-400">{member.inProgress}</td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${Math.round((member.completed / member.assigned) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {Math.round((member.completed / member.assigned) * 100)}%
                                            </span>
                                        </div>
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
