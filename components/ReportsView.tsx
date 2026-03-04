'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Users, CheckCircle, Clock, AlertTriangle, Download, Filter, X } from 'lucide-react';
import { Task, User } from '@/types';
import { getTimeRangeDate, isOverdue } from '@/lib/utils';

interface ReportsViewProps {
    projectId: string;
    tasks?: Task[];
}

interface MetricCard {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

interface FilterState {
    status: string[];
    priority: string[];
    assignee: string;
}

export default function ReportsView({ projectId, tasks = [] }: ReportsViewProps) {
    const [timeRange, setTimeRange] = useState('all');
    const [projectTasks, setProjectTasks] = useState<Task[]>(tasks);
    const [users, setUsers] = useState<User[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        status: [],
        priority: [],
        assignee: ''
    });

    // Fetch tasks if not provided
    useEffect(() => {
        if (tasks.length === 0) {
            fetch(`/api/tasks?projectId=${projectId}`)
                .then(res => res.json())
                .then(data => setProjectTasks(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [projectId, tasks]);

    // Fetch users for assignee filter
    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    // getTimeRangeDate is now imported from lib/utils

    // Apply all filters
    const filteredTasks = useMemo(() => {
        const timeRangeDate = getTimeRangeDate(timeRange as 'week' | 'month' | 'quarter' | 'year' | 'all');

        return projectTasks.filter(task => {
            // Time range filter (only if not "all")
            if (timeRange !== 'all') {
                const taskDate = new Date(task.createdAt || task.updatedAt || new Date());
                if (taskDate < timeRangeDate) return false;
            }

            // Status filter
            if (filters.status.length > 0 && !filters.status.includes(task.status)) {
                return false;
            }

            // Priority filter
            if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
                return false;
            }

            // Assignee filter
            if (filters.assignee && task.assigneeId !== filters.assignee) {
                return false;
            }

            return true;
        });
    }, [projectTasks, timeRange, filters]);

    // Calculate metrics from filtered tasks (100% real data)
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'Done').length;
    const inProgressTasks = filteredTasks.filter(t => t.status === 'In Progress').length;
    const todoTasks = filteredTasks.filter(t => t.status === 'To Do').length;
    const reviewTasks = filteredTasks.filter(t => t.status === 'Review').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const overdueTasks = filteredTasks.filter(t => {
        if (!t.dueDate) return false;
        return isOverdue(t.dueDate) && t.status !== 'Done';
    }).length;

    const metrics: MetricCard[] = [
        {
            title: 'Total Tasks',
            value: totalTasks,
            icon: <BarChart3 size={20} />,
            color: 'bg-blue-500'
        },
        {
            title: 'Completed',
            value: completedTasks,
            icon: <CheckCircle size={20} />,
            color: 'bg-green-500'
        },
        {
            title: 'In Progress',
            value: inProgressTasks,
            icon: <Clock size={20} />,
            color: 'bg-yellow-500'
        },
        {
            title: 'Overdue',
            value: overdueTasks,
            icon: <AlertTriangle size={20} />,
            color: 'bg-red-500'
        }
    ];

    // Status distribution (real data)
    const statusDistribution = [
        { status: 'To Do', count: todoTasks, color: 'bg-gray-400' },
        { status: 'In Progress', count: inProgressTasks, color: 'bg-blue-500' },
        { status: 'Review', count: reviewTasks, color: 'bg-purple-500' },
        { status: 'Done', count: completedTasks, color: 'bg-green-500' }
    ];

    // Priority distribution (real data)
    const priorityDistribution = [
        { priority: 'Critical', count: filteredTasks.filter(t => t.priority === 'Critical').length, color: 'bg-red-600' },
        { priority: 'High', count: filteredTasks.filter(t => t.priority === 'High').length, color: 'bg-orange-500' },
        { priority: 'Medium', count: filteredTasks.filter(t => t.priority === 'Medium').length, color: 'bg-yellow-500' },
        { priority: 'Low', count: filteredTasks.filter(t => t.priority === 'Low').length, color: 'bg-green-500' }
    ];

    // Team performance from actual database (real data)
    const getTeamPerformance = () => {
        const userMap = new Map<string, { name: string; assigned: number; completed: number; inProgress: number }>();

        users.forEach(user => {
            userMap.set(user.id, { name: user.name, assigned: 0, completed: 0, inProgress: 0 });
        });

        filteredTasks.forEach(task => {
            if (task.assigneeId && userMap.has(task.assigneeId)) {
                const user = userMap.get(task.assigneeId)!;
                user.assigned++;
                if (task.status === 'Done') user.completed++;
                if (task.status === 'In Progress') user.inProgress++;
            }
        });

        return Array.from(userMap.values()).filter(u => u.assigned > 0);
    };

    const teamPerformance = getTeamPerformance();

    // Unassigned tasks count (real data)
    const unassignedTasks = filteredTasks.filter(t => !t.assigneeId).length;

    // Export to CSV (combined: task details + time tracking)
    const handleExport = async () => {
        // Fetch time tracking data for this project
        let timeData: { perTask: any[]; perUser: any[]; perProject: any[] } = { perTask: [], perUser: [], perProject: [] };
        try {
            const res = await fetch(`/api/time-tracking?projectId=${projectId}`);
            if (res.ok) {
                timeData = await res.json();
            }
        } catch { /* proceed without time data */ }

        // Build a lookup of time per task
        const timeByTask = new Map<string, { totalMinutes: number; lastEntry: string }>();
        (timeData.perTask || []).forEach((t: any) => {
            timeByTask.set(t.taskId, { totalMinutes: t.totalMinutes, lastEntry: t.lastEntry });
        });

        // Section 1: Task Details + Time
        const taskHeaders = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created At', 'Time Logged (min)', 'Time Logged (hrs)', 'Last Time Entry'];
        const taskRows = filteredTasks.map(task => {
            const assignee = users.find(u => u.id === task.assigneeId);
            const time = timeByTask.get(task.id);
            return [
                task.title,
                task.status,
                task.priority,
                assignee?.name || 'Unassigned',
                task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
                task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '',
                time ? time.totalMinutes.toString() : '0',
                time ? (time.totalMinutes / 60).toFixed(1) : '0',
                time?.lastEntry ? new Date(time.lastEntry).toLocaleDateString() : '-',
            ];
        });

        // Section 2: User Time Summary
        const userHeaders = ['User', 'Tasks with Time', 'Total Minutes', 'Total Hours'];
        const userRows = (timeData.perUser || []).map((u: any) => [
            u.userName, u.taskCount?.toString() || '0', u.totalMinutes?.toString() || '0', (u.totalMinutes / 60).toFixed(1),
        ]);

        // Section 3: Project Time Summary (only if global)
        const projHeaders = ['Project', 'Tasks', 'Total Minutes', 'Total Hours'];
        const projRows = (timeData.perProject || []).map((p: any) => [
            p.projectName, p.taskCount?.toString() || '0', p.totalMinutes?.toString() || '0', (p.totalMinutes / 60).toFixed(1),
        ]);

        const esc = (c: string) => `"${(c || '').replace(/"/g, '""')}"`;
        const lines = [
            '--- Task Report ---',
            taskHeaders.map(esc).join(','),
            ...taskRows.map(r => r.map(esc).join(',')),
            '',
            '--- User Time Summary ---',
            userHeaders.map(esc).join(','),
            ...userRows.map((r: string[]) => r.map(esc).join(',')),
            '',
            '--- Project Time Summary ---',
            projHeaders.map(esc).join(','),
            ...projRows.map((r: string[]) => r.map(esc).join(',')),
        ];

        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `full-report-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Toggle filter value
    const toggleFilter = (type: 'status' | 'priority', value: string) => {
        setFilters(prev => {
            const current = prev[type];
            if (current.includes(value)) {
                return { ...prev, [type]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [type]: [...current, value] };
            }
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({ status: [], priority: [], assignee: '' });
    };

    const activeFilterCount = filters.status.length + filters.priority.length + (filters.assignee ? 1 : 0);

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
                        Analytics based on {totalTasks} task{totalTasks !== 1 ? 's' : ''} from database
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="all">All Time</option>
                        <option value="week">Last 7 days</option>
                        <option value="month">Last 30 days</option>
                        <option value="quarter">Last 90 days</option>
                        <option value="year">Last year</option>
                    </select>
                    <button
                        onClick={() => setShowFilters(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative"
                    >
                        <Filter size={16} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters Modal */}
            {showFilters && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFilters(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Reports</h3>
                            <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Status Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {['To Do', 'In Progress', 'Review', 'Done'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => toggleFilter('status', status)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.status.includes(status)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                            <div className="flex flex-wrap gap-2">
                                {['Critical', 'High', 'Medium', 'Low'].map(priority => (
                                    <button
                                        key={priority}
                                        onClick={() => toggleFilter('priority', priority)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filters.priority.includes(priority)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {priority}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assignee Filter */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
                            <select
                                value={filters.assignee}
                                onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">All Team Members</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={clearFilters}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Metric Cards - All Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 ${metric.color} rounded-lg flex items-center justify-center text-white`}>
                                {metric.icon}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{metric.title}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Completion Rate - Real Data */}
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

                {/* Status Distribution - Real Data */}
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
                {/* Priority Distribution - Real Data */}
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

                {/* Assignment Overview - Real Data */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assignment Overview</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Assigned Tasks</span>
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">{totalTasks - unassignedTasks}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <span className="text-sm text-orange-600 dark:text-orange-400">Unassigned Tasks</span>
                            <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">{unassignedTasks}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="text-sm text-red-600 dark:text-red-400">Overdue Tasks</span>
                            <span className="text-lg font-semibold text-red-600 dark:text-red-400">{overdueTasks}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Performance - Real Data from Database */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users size={20} className="text-blue-500" />
                    Team Performance (From Database)
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
                            {teamPerformance.length > 0 ? teamPerformance.map((member, idx) => (
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
                                                    style={{ width: `${member.assigned > 0 ? Math.round((member.completed / member.assigned) * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {member.assigned > 0 ? Math.round((member.completed / member.assigned) * 100) : 0}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">
                                        No team members with assigned tasks found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Task List Preview - Real Data */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Tasks ({filteredTasks.length} total)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredTasks.slice(0, 10).map((task, idx) => {
                        const assignee = users.find(u => u.id === task.assigneeId);
                        return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${task.priority === 'Critical' ? 'bg-red-500' :
                                        task.priority === 'High' ? 'bg-orange-500' :
                                            task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`} />
                                    <span className="text-sm text-gray-900 dark:text-white">{task.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded ${task.status === 'Done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                        }`}>
                                        {task.status}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {assignee?.name || 'Unassigned'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {filteredTasks.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No tasks found with current filters
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
