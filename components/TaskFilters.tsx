'use client';

import React from 'react';
import { Priority, Status, User } from '@/types';
import { Filter, X, Search } from 'lucide-react';

interface TaskFiltersProps {
    users: User[];
    statusFilter: Status | 'all';
    priorityFilter: Priority | 'all';
    assigneeFilter: string | 'all';
    onStatusChange: (status: Status | 'all') => void;
    onPriorityChange: (priority: Priority | 'all') => void;
    onAssigneeChange: (assigneeId: string | 'all') => void;
    onClearFilters: () => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export function TaskFilters({
    users,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    onStatusChange,
    onPriorityChange,
    onAssigneeChange,
    onClearFilters,
    searchQuery = '',
    onSearchChange,
}: TaskFiltersProps) {
    const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || searchQuery !== '';

    return (
        <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
            {/* Search Input */}
            {onSearchChange && (
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-48 pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Filter size={14} />
                <span className="font-medium">Filters:</span>
            </div>

            {/* Status Filter */}
            <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value as Status | 'all')}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="all">All Status</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
            </select>

            {/* Priority Filter */}
            <select
                value={priorityFilter}
                onChange={(e) => onPriorityChange(e.target.value as Priority | 'all')}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="all">All Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
            </select>

            {/* Assignee Filter */}
            <select
                value={assigneeFilter}
                onChange={(e) => onAssigneeChange(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={() => {
                        onClearFilters();
                        onSearchChange?.('');
                    }}
                    className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 rounded"
                >
                    <X size={14} />
                    Clear
                </button>
            )}
        </div>
    );
}

