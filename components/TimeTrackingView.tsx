'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Users, BarChart3, Timer, Filter, X, TrendingUp, Activity, Briefcase, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Task, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface TimeTrackingViewProps {
    projectId?: string;
    tasks?: Task[];
}

interface SummaryData {
    totalMinutes: number;
    totalHours: number;
    avgMinutesPerTask: number;
    avgHoursPerTask: number;
    tasksWithTimeLogs: number;
    activeTimerCount: number;
}

interface UserTime {
    userId: string;
    userName: string;
    totalMinutes: number;
    taskCount: number;
}

interface TaskTime {
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
    assigneeId: string;
    assigneeName: string;
    totalMinutes: number;
    lastEntry: string;
}

interface ProjectTime {
    projectId: string;
    projectName: string;
    totalMinutes: number;
    taskCount: number;
}

interface DailyTrend {
    date: string;
    minutes: number;
}

interface ActiveTimer {
    taskId: string;
    taskTitle: string;
    userId: string;
    userName: string;
    startedAt: string;
}

interface FilterOption {
    id: string;
    name: string;
}

interface AnalyticsData {
    summary: SummaryData;
    perUser: UserTime[];
    perTask: TaskTime[];
    perProject: ProjectTime[];
    dailyTrend: DailyTrend[];
    activeTimers: ActiveTimer[];
    users: FilterOption[];
    projects: FilterOption[];
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatHours(minutes: number): string {
    return (minutes / 60).toFixed(1);
}

// Pure CSS bar chart helpers
const BAR_COLORS = [
    'bg-blue-500 dark:bg-blue-400',
    'bg-emerald-500 dark:bg-emerald-400',
    'bg-violet-500 dark:bg-violet-400',
    'bg-amber-500 dark:bg-amber-400',
    'bg-rose-500 dark:bg-rose-400',
    'bg-cyan-500 dark:bg-cyan-400',
    'bg-indigo-500 dark:bg-indigo-400',
    'bg-teal-500 dark:bg-teal-400',
    'bg-orange-500 dark:bg-orange-400',
    'bg-pink-500 dark:bg-pink-400',
];

export default function TimeTrackingView({ projectId, tasks: propTasks }: TimeTrackingViewProps) {
    const { currentUser } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [filterUser, setFilterUser] = useState('');
    const [filterProject, setFilterProject] = useState(projectId || '');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeSection, setActiveSection] = useState<'users' | 'tasks' | 'projects' | 'trends'>('users');
    const [trendOffset, setTrendOffset] = useState(0);
    const TREND_VISIBLE_DAYS = 14;

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filterProject) params.set('projectId', filterProject);
            if (filterUser) params.set('userId', filterUser);
            if (filterStartDate) params.set('startDate', filterStartDate);
            if (filterEndDate) params.set('endDate', filterEndDate);

            const res = await fetch(`/api/time-tracking?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch');
            }
            const result = await res.json();
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to load time tracking data');
        } finally {
            setLoading(false);
        }
    }, [filterProject, filterUser, filterStartDate, filterEndDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // When projectId prop changes, update filter
    useEffect(() => {
        if (projectId) setFilterProject(projectId);
    }, [projectId]);

    const hasActiveFilters = filterUser || filterStartDate || filterEndDate || (filterProject && !projectId);

    const clearFilters = () => {
        setFilterUser('');
        setFilterProject(projectId || '');
        setFilterStartDate('');
        setFilterEndDate('');
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
                    <button onClick={fetchData} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const maxUserMinutes = Math.max(...data.perUser.map(u => u.totalMinutes), 1);
    const maxDailyMinutes = Math.max(...data.dailyTrend.map(d => d.minutes), 1);
    const maxProjectMinutes = Math.max(...data.perProject.map(p => p.totalMinutes), 1);

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Time Tracking & Analytics</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {projectId ? 'Project-level time insights' : 'Cross-project time insights'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${showFilters || hasActiveFilters
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700'
                            }`}
                    >
                        <Filter size={14} />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
                        title="Refresh data"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter & Report</h3>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400">
                                <X size={12} /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {!projectId && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project</label>
                                <select
                                    value={filterProject}
                                    onChange={e => setFilterProject(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">All Projects</option>
                                    {data.projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">User</label>
                            <select
                                value={filterUser}
                                onChange={e => setFilterUser(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">All Users</option>
                                {data.users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filterStartDate}
                                onChange={e => setFilterStartDate(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={e => setFilterEndDate(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <Clock size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Hours</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.summary.totalHours}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.summary.totalMinutes} minutes total</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg / Task</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.summary.avgHoursPerTask}h</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.summary.avgMinutesPerTask} min average</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                            <Timer size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Timers</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.summary.activeTimerCount}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {data.summary.activeTimerCount > 0 ? 'Currently running' : 'No active timers'}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <BarChart3 size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tasks Tracked</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.summary.tasksWithTimeLogs}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tasks with time logs</p>
                </div>
            </div>

            {/* Active Timers Banner */}
            {data.activeTimers.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-4 ring-1 ring-green-200 dark:ring-green-800">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Live Timers</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {data.activeTimers.map(timer => {
                            const elapsed = Math.round((Date.now() - new Date(timer.startedAt).getTime()) / 60000);
                            return (
                                <div key={timer.taskId} className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 rounded-lg px-3 py-2 text-sm">
                                    <Timer size={14} className="text-green-600 dark:text-green-400 animate-pulse" />
                                    <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{timer.taskTitle}</span>
                                    <span className="text-gray-500 dark:text-gray-400">·</span>
                                    <span className="text-gray-600 dark:text-gray-300">{timer.userName}</span>
                                    <span className="text-xs text-green-600 dark:text-green-400 font-mono">{formatDuration(elapsed)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Section Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                {[
                    { key: 'users' as const, label: 'By User', icon: Users },
                    { key: 'tasks' as const, label: 'By Task', icon: BarChart3 },
                    ...(!projectId ? [{ key: 'projects' as const, label: 'By Project', icon: Briefcase }] : []),
                    { key: 'trends' as const, label: 'Daily Trends', icon: TrendingUp },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSection(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === tab.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Section Content */}
            <div className="bg-white dark:bg-gray-800 rounded-xl ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm overflow-hidden">
                {/* By User */}
                {activeSection === 'users' && (
                    <div>
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hours by Team Member</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total time logged per user across matched tasks</p>
                        </div>
                        {data.perUser.length === 0 ? (
                            <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                                <Clock size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No time data found</p>
                                <p className="text-xs mt-1">Start a timer on any task to see data here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {data.perUser.map((user, idx) => (
                                    <div key={user.userId} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${BAR_COLORS[idx % BAR_COLORS.length].replace('dark:bg-', 'dark:bg-').split(' ')[0]}`}>
                                            {user.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.userName}</span>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{user.taskCount} tasks</span>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDuration(user.totalMinutes)}</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-700 ease-out ${BAR_COLORS[idx % BAR_COLORS.length].split(' ')[0]}`}
                                                    style={{ width: `${Math.max(2, (user.totalMinutes / maxUserMinutes) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* By Task */}
                {activeSection === 'tasks' && (
                    <div>
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Time per Task</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Detailed breakdown of logged time for each task</p>
                        </div>
                        {data.perTask.length === 0 ? (
                            <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                                <BarChart3 size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No task time data</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/50">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                                            {!projectId && <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>}
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assignee</th>
                                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Entry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {data.perTask.map(task => (
                                            <tr key={task.taskId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-5 py-3">
                                                    <span className="font-medium text-gray-900 dark:text-white">{task.taskTitle}</span>
                                                </td>
                                                {!projectId && (
                                                    <td className="px-5 py-3">
                                                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">{task.projectName}</span>
                                                    </td>
                                                )}
                                                <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{task.assigneeName}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="font-semibold text-gray-900 dark:text-white">{formatDuration(task.totalMinutes)}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right text-gray-500 dark:text-gray-400">
                                                    {task.lastEntry ? new Date(task.lastEntry).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* By Project */}
                {activeSection === 'projects' && (
                    <div>
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Project Time Distribution</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total time logged per project</p>
                        </div>
                        {data.perProject.length === 0 ? (
                            <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                                <Briefcase size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No project time data</p>
                            </div>
                        ) : (
                            <div className="p-5 space-y-4">
                                {data.perProject.map((proj, idx) => (
                                    <div key={proj.projectId} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={14} className="text-gray-400 dark:text-gray-500" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{proj.projectName}</span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">({proj.taskCount} tasks)</span>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDuration(proj.totalMinutes)}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-700 ease-out ${BAR_COLORS[idx % BAR_COLORS.length].split(' ')[0]}`}
                                                style={{ width: `${Math.max(3, (proj.totalMinutes / maxProjectMinutes) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Daily Trends */}
                {activeSection === 'trends' && (
                    <div>
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Daily Productivity Trends</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hours logged per day over the selected period</p>
                        </div>
                        {data.dailyTrend.length === 0 ? (
                            <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                                <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No daily trend data</p>
                                <p className="text-xs mt-1">Time logs will appear here as they are recorded</p>
                            </div>
                        ) : (
                            <div className="p-5">
                                {/* Scrollable Bar Chart */}
                                {(() => {
                                    const totalDays = data.dailyTrend.length;
                                    const visibleDays = Math.min(TREND_VISIBLE_DAYS, totalDays);
                                    const maxOffset = Math.max(0, totalDays - visibleDays);
                                    const currentOffset = Math.min(trendOffset, maxOffset);
                                    const startIdx = maxOffset - currentOffset;
                                    const visibleData = data.dailyTrend.slice(startIdx, startIdx + visibleDays);
                                    const visibleMax = Math.max(...visibleData.map(d => d.minutes), 1);
                                    const canGoLeft = currentOffset < maxOffset;
                                    const canGoRight = currentOffset > 0;

                                    return (
                                        <>
                                            <div className="flex items-center gap-2 mb-3">
                                                <button
                                                    onClick={() => setTrendOffset(Math.min(currentOffset + TREND_VISIBLE_DAYS, maxOffset))}
                                                    disabled={!canGoLeft}
                                                    className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                    title="Show earlier dates"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 text-center">
                                                    {new Date(visibleData[0]?.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                    {' — '}
                                                    {new Date(visibleData[visibleData.length - 1]?.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                </span>
                                                <button
                                                    onClick={() => setTrendOffset(Math.max(currentOffset - TREND_VISIBLE_DAYS, 0))}
                                                    disabled={!canGoRight}
                                                    className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                    title="Show later dates"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-end gap-1 h-48 mb-4">
                                                {visibleData.map((day) => {
                                                    const barHeight = Math.max(4, (day.minutes / visibleMax) * 100);
                                                    return (
                                                        <div
                                                            key={day.date}
                                                            className="flex-1 flex flex-col items-center justify-end group relative h-full"
                                                        >
                                                            <div className="absolute -top-8 bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                                {formatDuration(day.minutes)}
                                                            </div>
                                                            <div
                                                                className="w-full rounded-t-md bg-blue-500 dark:bg-blue-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-300 transition-all duration-300 cursor-pointer min-w-[4px]"
                                                                style={{ height: `${barHeight}%` }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex gap-1">
                                                {visibleData.map((day) => (
                                                    <div key={day.date} className="flex-1 text-center">
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* Summary stats row */}
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Peak Day</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatDuration(maxDailyMinutes)}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg / Day</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatDuration(Math.round(data.dailyTrend.reduce((sum, d) => sum + d.minutes, 0) / data.dailyTrend.length))}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Days Tracked</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.dailyTrend.length}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatDuration(data.dailyTrend.reduce((sum, d) => sum + d.minutes, 0))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
