'use client';

import React, { useState } from 'react';
import { Task, Status } from '@/types';
import { Search, ChevronDown, User, Zap, Circle } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { STATUSES } from '@/lib/constants';

const TIMELINE_START = startOfMonth(new Date());
const TIMELINE_END_MONTHS = addMonths(TIMELINE_START, 6);
const TIMELINE_END_QUARTERS = addMonths(TIMELINE_START, 12);

export default function TimelineView({ tasks = [] }: { tasks?: Task[] }) {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'Months' | 'Quarters'>('Months');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const TIMELINE_END = viewMode === 'Months' ? TIMELINE_END_MONTHS : TIMELINE_END_QUARTERS;
  const TOTAL_DAYS = differenceInDays(TIMELINE_END, TIMELINE_START);

  const MONTHS = eachMonthOfInterval({
    start: TIMELINE_START,
    end: subMonths(TIMELINE_END, 1)
  });

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (!t.title.toLowerCase().includes(filter.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const getTaskStyle = (task: Task) => {
    let start = task.startDate ? new Date(task.startDate) : new Date();
    let end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000 * 7);

    if (start < TIMELINE_START) start = TIMELINE_START;
    if (end > TIMELINE_END) end = TIMELINE_END;

    const startOffsetDays = differenceInDays(start, TIMELINE_START);
    const durationDays = differenceInDays(end, start) + 1;

    const leftPct = (startOffsetDays / TOTAL_DAYS) * 100;
    const widthPct = (durationDays / TOTAL_DAYS) * 100;

    return {
      left: `${Math.max(0, leftPct)}%`,
      width: `${Math.max(3, widthPct)}%`,
      minWidth: '60px'
    };
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Done': return 'bg-green-500 border-green-600';
      case 'In Progress': return 'bg-blue-500 border-blue-600';
      case 'Review': return 'bg-purple-500 border-purple-600';
      default: return 'bg-gray-400 border-gray-500';
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 h-[600px] flex flex-col">
      {/* 1. Filter Bar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3 bg-white dark:bg-gray-800 z-20">
        <div className="relative">
          <input
            type="text"
            placeholder="Search timeline"
            className="pl-8 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500 focus:border-blue-500 w-48 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <Search className="absolute w-4 h-4 text-gray-400 left-2 top-1/2 transform -translate-y-1/2" />
        </div>
        <div className="flex -space-x-1 pl-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white z-10">U</div>
        </div>
        <div className="relative">
          <button
            className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-1"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            {statusFilter === 'all' ? 'All Status' : statusFilter} <ChevronDown size={12} />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 py-1 min-w-[140px]">
              <button
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${statusFilter === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
              >
                All Status
              </button>
              {STATUSES.map(status => (
                <button
                  key={status}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${statusFilter === status ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Split View */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANE: Task List */}
        <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Work ({filteredTasks.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 h-[50px]">
                <span className={`mr-2 flex-shrink-0 ${task.priority === 'Critical' ? 'text-red-500' : 'text-blue-500'}`}>
                  {task.priority === 'Critical' ? <Zap size={14} /> : <Circle size={14} fill="currentColor" />}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{task.title}</span>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm italic">No tasks match filter</div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Timeline Grid */}
        <div className="flex-1 flex flex-col overflow-x-auto relative scrollbar-hide">
          <div className="h-10 flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 min-w-[800px]">
            {MONTHS.map((m) => (
              <div key={m.toString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {format(m, 'MMM yy')}
              </div>
            ))}
          </div>

          <div className="flex-1 relative min-w-[800px] bg-white dark:bg-gray-800">
            <div className="absolute inset-0 flex pointer-events-none">
              {MONTHS.map((_, i) => (
                <div key={i} className="flex-1 border-r border-dashed border-gray-100 dark:border-gray-700 h-full"></div>
              ))}
            </div>

            <div className="absolute top-0 left-0 w-full pt-1">
              {filteredTasks.map((task) => (
                <div key={task.id} className="relative h-[50px] w-full flex items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                  <div
                    className={`absolute h-7 rounded-md border text-[11px] text-white flex items-center px-2 cursor-pointer shadow-sm hover:shadow-md transition-all overflow-hidden
                            ${getStatusColor(task.status)}
                        `}
                    style={getTaskStyle(task)}
                    title={`${task.title} - ${task.status}`}
                  >
                    {task.assigneeId && <User size={12} className="mr-1 opacity-75 flex-shrink-0" />}
                    <span className="truncate font-medium">{task.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2 bg-white dark:bg-gray-800">
        <div className="flex bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-xs divide-x divide-gray-300 dark:divide-gray-600 shadow-sm">
          <button className="px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">Today</button>
          <button
            onClick={() => setViewMode('Months')}
            className={`px-3 py-1 font-medium ${viewMode === 'Months' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
          >
            Months
          </button>
          <button
            onClick={() => setViewMode('Quarters')}
            className={`px-3 py-1 font-medium ${viewMode === 'Quarters' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
          >
            Quarters
          </button>
        </div>
      </div>
    </div>
  );
}