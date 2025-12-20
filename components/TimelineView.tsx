// ... imports
// (Ensure all imports are present from previous file content, recreating full file content for safety or using targeted replacement if confident.
// Given the complexity of state needed (filter string, view mode), I will wrap the component in state.)

// I'll rewrite the component to be safer with state.
import React, { useState } from 'react';
import { Task } from '@/types';
import { Search, ChevronDown, User } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, eachMonthOfInterval, differenceInDays } from 'date-fns';

const TIMELINE_START = startOfMonth(new Date());
const TIMELINE_END_MONTHS = addMonths(TIMELINE_START, 6);
const TIMELINE_END_QUARTERS = addMonths(TIMELINE_START, 12);

export default function TimelineView({ tasks = [] }: { tasks?: Task[] }) {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'Months' | 'Quarters'>('Months');

  const TIMELINE_END = viewMode === 'Months' ? TIMELINE_END_MONTHS : TIMELINE_END_QUARTERS;
  const TOTAL_DAYS = differenceInDays(TIMELINE_END, TIMELINE_START);

  const MONTHS = eachMonthOfInterval({
    start: TIMELINE_START,
    end: subMonths(TIMELINE_END, 1)
  });

  // Filter tasks
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(filter.toLowerCase()));

  const getTaskStyle = (task: Task) => {
    let start = task.startDate ? new Date(task.startDate) : new Date();
    let end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000 * 2);

    if (start < TIMELINE_START) start = TIMELINE_START;
    if (end > TIMELINE_END) end = TIMELINE_END;

    const startOffsetDays = differenceInDays(start, TIMELINE_START);
    const durationDays = differenceInDays(end, start) + 1;

    const leftPct = (startOffsetDays / TOTAL_DAYS) * 100;
    const widthPct = (durationDays / TOTAL_DAYS) * 100;

    return {
      left: `${Math.max(0, leftPct)}%`,
      width: `${Math.max(0.5, widthPct)}%`
    };
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white h-[600px] flex flex-col">
      {/* 1. Filter Bar */}
      <div className="p-2 border-b border-gray-200 flex items-center space-x-3 bg-white z-20">
        <div className="relative">
          <input
            type="text"
            placeholder="Search timeline"
            className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500 w-48 focus:outline-none"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <Search className="absolute w-4 h-4 text-gray-400 left-2 top-1/2 transform -translate-y-1/2" />
        </div>
        <div className="flex -space-x-1 pl-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs text-white z-10">U</div>
        </div>
        <button className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-700 flex items-center gap-1">
          Status category <ChevronDown size={12} />
        </button>
      </div>

      {/* 2. Main Split View */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANE: Task List */}
        <div className="w-1/4 border-r border-gray-200 flex flex-col bg-white z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="h-10 border-b border-gray-200 flex items-center px-4 bg-gray-50 text-xs font-semibold text-gray-500">
            Work ({filteredTasks.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center px-4 py-3 border-b border-gray-100 h-[50px]">
                <span className={`mr-2 flex-shrink-0 ${task.priority === 'Critical' ? 'text-red-500' : 'text-blue-500'}`}>
                  {task.priority === 'Critical' ? '⚡' : '●'}
                </span>
                <span className="text-sm text-gray-700 truncate font-medium">{task.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE: Timeline Grid */}
        <div className="flex-1 flex flex-col overflow-x-auto relative scrollbar-hide">
          <div className="h-10 flex border-b border-gray-200 bg-gray-50 min-w-[800px]">
            {MONTHS.map((m) => (
              <div key={m.toString()} className="flex-1 border-r border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500 uppercase">
                {format(m, 'MMM yy')}
              </div>
            ))}
          </div>

          <div className="flex-1 relative min-w-[800px] bg-white">
            <div className="absolute inset-0 flex pointer-events-none">
              {MONTHS.map((_, i) => (
                <div key={i} className="flex-1 border-r border-dashed border-gray-100 h-full"></div>
              ))}
            </div>

            <div className="absolute top-0 left-0 w-full pt-1">
              {filteredTasks.map((task) => (
                <div key={task.id} className="relative h-[50px] w-full flex items-center hover:bg-gray-50/50">
                  <div
                    className={`absolute h-6 rounded-md border text-[10px] text-white flex items-center px-2 cursor-pointer shadow-sm hover:shadow-md transition-all
                            ${task.status === 'Done' ? 'bg-green-500 border-green-600' : 'bg-blue-500 border-blue-600'}
                        `}
                    style={getTaskStyle(task)}
                    title={`${task.title}`}
                  >
                    {task.assigneeId && <User size={10} className="mr-1 opacity-75" />}
                    <span className="truncate">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-2 border-t border-gray-200 flex justify-end space-x-2">
        <div className="flex bg-white border border-gray-300 rounded-md text-xs divide-x divide-gray-300 shadow-sm">
          <button className="px-3 py-1 hover:bg-gray-50 text-gray-600">Today</button>
          <button
            onClick={() => setViewMode('Months')}
            className={`px-3 py-1 font-medium ${viewMode === 'Months' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            Months
          </button>
          <button
            onClick={() => setViewMode('Quarters')}
            className={`px-3 py-1 font-medium ${viewMode === 'Quarters' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            Quarters
          </button>
        </div>
      </div>
    </div>
  );
}