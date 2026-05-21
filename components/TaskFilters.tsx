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

import { CustomSelect, SelectOption } from './ui/CustomSelect';

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

    const statusOptions: SelectOption[] = [
        { value: 'all', label: 'All Status' },
        { value: 'To Do', label: 'To Do' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Review', label: 'Review' },
        { value: 'Done', label: 'Done' },
    ];

    const priorityOptions: SelectOption[] = [
        { value: 'all', label: 'All Priority' },
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    const assigneeOptions: SelectOption[] = [
        { value: 'all', label: 'All Assignees' },
        { value: 'unassigned', label: 'Unassigned' },
        ...users.map(u => ({
            value: u.id,
            label: u.name,
            avatar: u.name.charAt(0).toUpperCase(),
            metadata: u.email,
            avatarUrl: u.avatarUrl
        }))
    ];

    return (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 w-full">
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

            <div className="flex items-center gap-3 flex-wrap ml-auto">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mr-1">
                    <Filter size={14} />
                    <span className="font-medium whitespace-nowrap">Filters:</span>
                </div>

                <CustomSelect
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(val) => onStatusChange(val as Status | 'all')}
                    className="w-40"
                    searchable={false}
                />

                <CustomSelect
                    options={priorityOptions}
                    value={priorityFilter}
                    onChange={(val) => onPriorityChange(val as Priority | 'all')}
                    className="w-40"
                    searchable={false}
                />

                <CustomSelect
                    options={assigneeOptions}
                    value={assigneeFilter}
                    onChange={onAssigneeChange}
                    className="w-52"
                    placeholder="All Assignees"
                />

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
        </div>
    );
}

