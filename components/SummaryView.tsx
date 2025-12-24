'use client';

import React, { useEffect, useState } from 'react';
import { Task, ActivityLog, User } from '@/types';
import { Activity, PieChart, Info, TrendingUp, Clock, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SummaryViewProps {
  tasks: Task[];
  projectId?: string;
}

const StatusChart = ({ tasks }: { tasks: Task[] }) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const review = tasks.filter(t => t.status === 'Review').length;

  // Calculate percentages for the donut chart
  const donePct = total ? (done / total * 100) : 0;
  const ipPct = total ? (inProgress / total * 100) : 0;
  const reviewPct = total ? (review / total * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center mr-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <path
            className="text-gray-100 dark:text-gray-700"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
          {/* Done segment (green) */}
          <path
            className="text-green-500 transition-all duration-1000 ease-out"
            strokeDasharray={`${donePct}, 100`}
            strokeDashoffset="0"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
          {/* In Progress segment (blue) */}
          <path
            className="text-blue-500 transition-all duration-1000 ease-out"
            strokeDasharray={`${ipPct}, 100`}
            strokeDashoffset={`${-donePct}`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
          {/* Review segment (yellow) */}
          <path
            className="text-yellow-500 transition-all duration-1000 ease-out"
            strokeDasharray={`${reviewPct}, 100`}
            strokeDashoffset={`${-(donePct + ipPct)}`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
        </svg>
        {/* Center Number */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-3xl font-bold text-gray-800 dark:text-white">{total}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">tasks</span>
        </div>
      </div>
    </div>
  )
};

// Priority-based work type chart
const TypesOfWorkChart = ({ tasks }: { tasks: Task[] }) => {
  const critical = tasks.filter(t => t.priority === 'Critical').length;
  const high = tasks.filter(t => t.priority === 'High').length;
  const medium = tasks.filter(t => t.priority === 'Medium').length;
  const low = tasks.filter(t => t.priority === 'Low').length;
  const total = tasks.length || 1;

  const priorities = [
    { label: 'Critical', count: critical, color: 'bg-red-500', pct: (critical / total * 100).toFixed(0) },
    { label: 'High', count: high, color: 'bg-orange-500', pct: (high / total * 100).toFixed(0) },
    { label: 'Medium', count: medium, color: 'bg-yellow-500', pct: (medium / total * 100).toFixed(0) },
    { label: 'Low', count: low, color: 'bg-green-500', pct: (low / total * 100).toFixed(0) },
  ];

  return (
    <div className="space-y-3">
      {priorities.map(p => (
        <div key={p.label} className="flex items-center gap-3">
          <div className="w-16 text-sm font-medium text-gray-600 dark:text-gray-400">{p.label}</div>
          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${p.color} transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-2`}
              style={{ width: `${Math.max(Number(p.pct), p.count > 0 ? 15 : 0)}%` }}
            >
              {p.count > 0 && (
                <span className="text-xs font-bold text-white">{p.count}</span>
              )}
            </div>
          </div>
          <div className="w-10 text-right text-sm text-gray-500 dark:text-gray-400">{p.pct}%</div>
        </div>
      ))}
    </div>
  );
};

// Tag distribution component
const TagCloud = ({ tasks }: { tasks: Task[] }) => {
  const tagCounts: Record<string, number> = {};
  tasks.forEach(task => {
    (task.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (sortedTags.length === 0) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No tags assigned yet</div>;
  }

  const tagColors = [
    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
    'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
    'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {sortedTags.map(([tag, count], i) => (
        <span
          key={tag}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${tagColors[i % tagColors.length]}`}
        >
          {tag} <span className="opacity-60">({count})</span>
        </span>
      ))}
    </div>
  );
};

const ActivityItem = ({ description, time }: { description: string, time: string }) => (
  <div className="flex space-x-3 text-sm py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
    <div className="flex-1 min-w-0">
      <p className="text-gray-700 dark:text-gray-300 truncate">{description}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{time}</p>
    </div>
  </div>
);

export default function SummaryView({ tasks, projectId }: SummaryViewProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const done = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const review = tasks.filter(t => t.status === 'Review').length;
  const todo = tasks.filter(t => t.status === 'To Do').length;

  // Calculate overdue and upcoming
  const now = new Date();
  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false;
    return new Date(t.dueDate) < now;
  }).length;

  const dueThisWeek = tasks.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false;
    const dueDate = new Date(t.dueDate);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= weekFromNow;
  }).length;

  // Fetch activity logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activityRes, usersRes] = await Promise.all([
          fetch('/api/activity'),
          fetch('/api/users')
        ]);

        if (activityRes.ok) {
          const data = await activityRes.json();
          // Filter to project tasks if projectId provided
          const projectTaskIds = new Set(tasks.map(t => t.id));
          const filtered = projectId
            ? data.filter((log: ActivityLog) => projectTaskIds.has(log.entityId))
            : data;
          setActivityLogs(filtered.slice(0, 5));
        }

        if (usersRes.ok) {
          setUsers(await usersRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      }
    };
    fetchData();
  }, [tasks, projectId]);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Someone';
  };

  const formatActivityTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Target size={14} />
            <span className="text-xs font-medium uppercase">To Do</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{todo}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium uppercase">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{inProgress}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-yellow-500 mb-1">
            <Clock size={14} />
            <span className="text-xs font-medium uppercase">In Review</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{review}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <CheckCircle2 size={14} />
            <span className="text-xs font-medium uppercase">Done</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{done}</div>
        </div>
      </div>

      {/* Main Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Status Overview Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Status Overview</h2>
            <Info size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex flex-col sm:flex-row items-center">
            <StatusChart tasks={tasks} />
            <div className="space-y-3 mt-4 sm:mt-0 w-full">
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                {done} Done
              </div>
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                {inProgress} In Progress
              </div>
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                {review} Review
              </div>
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full mr-2"></span>
                {todo} To Do
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(overdue > 0 || dueThisWeek > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {overdue > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} />
                  <span>{overdue} overdue task{overdue !== 1 ? 's' : ''}</span>
                </div>
              )}
              {dueThisWeek > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                  <Clock size={14} />
                  <span>{dueThisWeek} due this week</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Priority Breakdown Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Priority Breakdown</h2>
            <PieChart size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
          <TypesOfWorkChart tasks={tasks} />
        </div>

        {/* 3. Recent Activity Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Recent Activity</h2>
            <Activity size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <ActivityItem
                  key={log.id}
                  description={`${getUserName(log.userId)} ${log.action.toLowerCase()} a ${log.entityType.toLowerCase()}`}
                  time={formatActivityTime(log.timestamp)}
                />
              ))
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags Row */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Popular Tags</h2>
        </div>
        <TagCloud tasks={tasks} />
      </div>
    </div>
  );
}