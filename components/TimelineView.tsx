'use client';

import React, { useState } from 'react';
import { Task, Status } from '@/types';
import { Search, ChevronDown, User as UserIcon, Zap, Circle, ZoomIn, ZoomOut } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { STATUSES } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const TIMELINE_START = startOfMonth(new Date());
const TIMELINE_END_MONTHS = addMonths(TIMELINE_START, 6);
const TIMELINE_END_QUARTERS = addMonths(TIMELINE_START, 12);

export default function TimelineView({ tasks = [] }: { tasks?: Task[] }) {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'Months' | 'Quarters'>('Months');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const { users } = useAuth();

  const TIMELINE_END = viewMode === 'Months' ? TIMELINE_END_MONTHS : TIMELINE_END_QUARTERS;
  const TOTAL_DAYS = differenceInDays(TIMELINE_END, TIMELINE_START);
  const baseTimelineWidth = 800;
  const timelineWidth = baseTimelineWidth * zoomLevel;

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
      case 'Done': return 'bg-green-500 border-green-600 text-white ring-1 ring-inset ring-black/10';
      case 'In Progress': return 'bg-blue-500 border-blue-600 text-white ring-1 ring-inset ring-black/10';
      case 'Review': return 'bg-purple-500 border-purple-600 text-white ring-1 ring-inset ring-black/10';
      default: return 'bg-gray-500 border-gray-600 text-white ring-1 ring-inset ring-black/10';
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden bg-white dark:bg-gray-800 h-[600px] flex flex-col">
      {/* 1. Filter Bar */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 z-20">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search timeline"
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-56 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all shadow-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <Search className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          <div className="relative">
            <button
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors shadow-sm"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              {statusFilter === 'all' ? 'All Status' : statusFilter} <ChevronDown size={14} className="text-gray-400" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl z-30 py-1 min-w-[150px] overflow-hidden">
                <button
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${statusFilter === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
                >
                  All Status
                </button>
                {STATUSES.map(status => (
                  <button
                    key={status}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${statusFilter === status ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium text-gray-500 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="flex bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs divide-x divide-gray-300 dark:divide-gray-600 shadow-sm overflow-hidden">
            <button className="px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors">Today</button>
            <button
              onClick={() => setViewMode('Months')}
              className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'Months' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
            >
              Months
            </button>
            <button
              onClick={() => setViewMode('Quarters')}
              className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'Quarters' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
            >
              Quarters
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Split View */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANE: Task List */}
        <div className="w-[280px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-shrink-0">
          <div className="h-11 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 bg-gray-50/80 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
            Work ({filteredTasks.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.map(task => (
              <div key={task.id} className="group flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 h-[52px] hover:bg-blue-50/50 dark:hover:bg-gray-800/80 transition-colors cursor-default">
                <span className={`mr-2.5 flex-shrink-0 transition-transform group-hover:scale-110 ${task.priority === 'Critical' ? 'text-red-500' : 'text-blue-500'}`}>
                  {task.priority === 'Critical' ? <Zap size={15} /> : <Circle size={15} fill="currentColor" />}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{task.title}</span>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">No tasks match filter</div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Timeline Grid */}
        <div className="flex-1 flex flex-col overflow-x-auto relative scrollbar-hide">
          <div className="h-11 flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50" style={{ minWidth: `${timelineWidth}px` }}>
            {MONTHS.map((m) => (
              <div key={m.toString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-stripes-pattern">
                {format(m, 'MMM yy')}
              </div>
            ))}
          </div>

          <div className="flex-1 relative bg-white dark:bg-gray-800" style={{ minWidth: `${timelineWidth}px` }}>
            <div className="absolute inset-0 flex pointer-events-none">
              {MONTHS.map((_, i) => (
                <div key={i} className="flex-1 border-r border-dashed border-gray-200/50 dark:border-gray-700/50 h-full"></div>
              ))}
            </div>

            <div className="absolute top-0 left-0 w-full pt-1.5">
              {filteredTasks.map((task) => {
                const assignee = users?.find(u => u.id === task.assigneeId);
                return (
                  <div key={task.id} className="relative h-[52px] w-full flex items-center hover:bg-gray-50/30 dark:hover:bg-gray-700/30 group">
                    <div
                      className={`absolute h-8 rounded-full border border-transparent text-[11px] font-medium flex items-center pr-3 pl-1 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 overflow-hidden group-hover:brightness-110
                            ${getStatusColor(task.status)}
                        `}
                      style={getTaskStyle(task)}
                      title={`${task.title} - ${task.status} (${assignee?.name || 'Unassigned'})`}
                    >
                      {task.assigneeId && (
                        <div className="w-6 h-6 mr-1.5 rounded-full bg-white/20 flex flex-shrink-0 items-center justify-center text-[10px] uppercase overflow-hidden border border-white/30">
                          {assignee?.avatarUrl ? (
                            <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                          ) : (
                            assignee ? assignee.name.charAt(0) : <UserIcon size={12} className="opacity-80" />
                          )}
                        </div>
                      )}
                      <span className="truncate tracking-wide">{task.title}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}