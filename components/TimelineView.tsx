'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Task, Status, Priority } from '@/types';
import { TaskDetailModal } from './TaskDetailModal';
import { Search, ChevronDown, User as UserIcon, Zap, Circle, ZoomIn, ZoomOut, Clock, Lock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, eachMonthOfInterval, eachQuarterOfInterval, differenceInDays } from 'date-fns';
import { STATUSES } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const TIMELINE_START = subMonths(startOfMonth(new Date()), 1); // Start from previous month
const TIMELINE_END_MONTHS = addMonths(TIMELINE_START, 18);      // 18 months total
const TIMELINE_END_QUARTERS = addMonths(TIMELINE_START, 36);    // 3 years total for Quarters view

export default function TimelineView({ tasks = [], onUpdateTask, projectMemberIds = [] }: { tasks?: Task[], onUpdateTask?: (task: Task) => void, projectMemberIds?: string[] }) {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'Months' | 'Quarters'>('Months');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(8); // Default zoom 800% to show ~3 months in viewport
  const { users } = useAuth();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const TIMELINE_END = viewMode === 'Months' ? TIMELINE_END_MONTHS : TIMELINE_END_QUARTERS;
  const TOTAL_DAYS = differenceInDays(TIMELINE_END, TIMELINE_START);
  const baseTimelineWidth = 800;
  const timelineWidth = baseTimelineWidth * zoomLevel;

  const TIME_UNITS = viewMode === 'Months' 
    ? eachMonthOfInterval({ start: TIMELINE_START, end: subMonths(TIMELINE_END, 1) })
    : eachQuarterOfInterval({ start: TIMELINE_START, end: subMonths(TIMELINE_END, 1) });

  const todayOffsetDays = differenceInDays(new Date(), TIMELINE_START);
  const todayLeftPct = Math.max(0, Math.min(100, (todayOffsetDays / TOTAL_DAYS) * 100));

  const filteredTasks = tasks.filter(t => {
    if (!t.title.toLowerCase().includes(filter.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const getTaskStyle = (task: Task) => {
    let start = task.startDate ? new Date(task.startDate) : new Date();
    let end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000 * 7);

    // Swap if somehow end is before start
    if (end < start) {
      const temp = start;
      start = end;
      end = temp;
    }

    if (start < TIMELINE_START) start = TIMELINE_START;
    if (end > TIMELINE_END) end = TIMELINE_END;
    if (end < start) end = start;

    const startOffsetDays = differenceInDays(start, TIMELINE_START);
    const durationDays = differenceInDays(end, start) + 1;

    const leftPct = (startOffsetDays / TOTAL_DAYS) * 100;
    const widthPct = (durationDays / TOTAL_DAYS) * 100;

    return {
      left: `${Math.max(0, leftPct)}%`,
      width: `${Math.max(3, widthPct)}%`,
      minWidth: '85px'
    };
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Done': 
        return 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-white shadow-emerald-500/30 ring-emerald-400/50';
      case 'In Progress': 
        return 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/30 ring-blue-400/50';
      case 'Review': 
        return 'bg-gradient-to-r from-blue-500 to-emerald-400 hover:from-blue-400 hover:to-emerald-300 text-white shadow-cyan-500/30 ring-cyan-400/50';
      default: 
        return 'bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-300 hover:to-slate-400 text-white shadow-slate-500/20 ring-slate-400/50';
    }
  };

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const scrollToToday = () => {
    if (bodyScrollRef.current) {
      // Calculate position of "Today" relative to the scrolled content
      const leftPos = 280 + (timelineWidth * todayLeftPct) / 100;
      const viewWidth = bodyScrollRef.current.clientWidth;
      const scrollToX = leftPos - viewWidth / 2;
      bodyScrollRef.current.scrollTo({ left: Math.max(0, scrollToX), behavior: 'smooth' });
    }
  };

  // Auto-scroll to previous month on mount so 3 months (prev, current, next) are visible
  useEffect(() => {
    if (bodyScrollRef.current) {
      // Scroll to put the start of the timeline (previous month) at the left edge
      bodyScrollRef.current.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  const ROW_HEIGHT = 'h-[64px]'; 

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-50/50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 overflow-hidden font-sans">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 z-50 relative shadow-sm flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 group">
            <input
              type="text"
              placeholder="Search Timeline..."
              className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none text-slate-900 dark:text-white transition-all shadow-inner hover:bg-white dark:hover:bg-slate-700"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <Search className="absolute w-4 h-4 text-slate-400 left-4 top-1/2 transform -translate-y-1/2 transition-colors group-hover:text-blue-500" />
          </div>

          <div className="relative">
            <button
              className="px-4 py-2 text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${statusFilter === 'all' ? 'bg-gradient-to-br from-slate-300 to-slate-400' : 'bg-gradient-to-br from-blue-500 to-emerald-400'}`} />
                {statusFilter === 'all' ? 'All Status' : statusFilter}
              </div>
              <ChevronDown size={14} className={`text-slate-400 ml-1 transition-transform duration-300 ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 py-2 min-w-[180px] overflow-hidden">
                <button
                  className={`w-full text-left px-5 py-2.5 text-sm transition-all duration-200 ${statusFilter === 'all' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
                >
                  All Status
                </button>
                {STATUSES.map(status => (
                  <button
                    key={status}
                    className={`w-full text-left px-5 py-2.5 text-sm transition-all duration-200 ${statusFilter === status ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between w-full lg:w-auto gap-3">
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl p-1 shadow-sm">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(1.5, prev - 0.5))} 
              disabled={zoomLevel <= 1.5}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-12 text-center select-none">
              {Math.round((zoomLevel - 1.5) * 100)}%
            </span>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(8, prev + 0.5))} 
              disabled={zoomLevel >= 8}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="flex bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl p-1 shadow-sm">
            <button 
              onClick={scrollToToday}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Clock size={14} className="text-emerald-500" />
              <span className="hidden sm:inline">Jump to Today</span>
            </button>
            <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 my-1" />
            <button onClick={() => setViewMode('Months')} className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${viewMode === 'Months' ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              Months
            </button>
            <button onClick={() => setViewMode('Quarters')} className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${viewMode === 'Quarters' ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              Quarters
            </button>
          </div>
        </div>
      </div>

      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdate={(updated) => {
          onUpdateTask?.(updated);
          setSelectedTask(updated);
        }}
        onDelete={(taskId) => {
          setIsDetailOpen(false);
          // Delete is usually handled by parent through sync
        }}
        projectMemberIds={projectMemberIds}
      />

      <div 
        ref={headerScrollRef}
        className="w-full overflow-hidden flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 z-40"
      >
        <div className="w-max min-w-full flex h-12">
          <div className="w-[280px] sticky left-0 z-50 flex items-center px-5 h-full flex-shrink-0 bg-slate-50/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-widest">
            Tasks <span className="ml-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
          </div>
          <div className="flex h-full flex-shrink-0" style={{ width: timelineWidth }}>
            {TIME_UNITS.map((m) => (
              <div key={m.toString()} className="flex-1 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                {viewMode === 'Months' ? format(m, 'MMM yyyy') : format(m, 'QQQ yyyy')}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={bodyScrollRef}
        className="flex-1 overflow-auto bg-white dark:bg-slate-900 relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
        onScroll={handleBodyScroll}
      >
        <div className="w-max min-w-full flex flex-col relative min-h-full">
          <div className="absolute inset-0 flex pointer-events-none z-0">
            <div className="w-[280px] flex-shrink-0 border-r border-slate-200/50 dark:border-slate-800/50" />
            <div className="relative flex-shrink-0" style={{ width: timelineWidth }}>
              <div className="absolute inset-0 flex">
                {TIME_UNITS.map((_, i) => (
                  <div key={i} className="flex-1 border-r border-dashed border-slate-200/60 dark:border-slate-800/60 h-full"></div>
                ))}
              </div>
              {todayLeftPct > 0 && todayLeftPct < 100 && (
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-rose-400 dark:bg-rose-500 z-10"
                  style={{ left: `${todayLeftPct}%` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-rose-400 dark:bg-rose-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-b-md tracking-wider shadow-sm">
                    TODAY
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col w-full">
            {/* Dependency Lines Overlay */}
            <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible" style={{ width: '100%', height: '100%' }}>
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="currentColor" className="text-blue-400" />
                </marker>
              </defs>
              {filteredTasks.map((task) => {
                if (!task.dependencies || task.dependencies.length === 0) return null;
                
                const targetIdx = filteredTasks.findIndex(t => t.id === task.id);
                const targetStyle = getTaskStyle(task);
                const targetLeft = parseFloat(targetStyle.left);
                const targetY = targetIdx * 64 + 32;

                return task.dependencies.map(depId => {
                  const depTask = filteredTasks.find(t => t.id === depId);
                  if (!depTask) return null;
                  
                  const depIdx = filteredTasks.findIndex(t => t.id === depId);
                  const depStyle = getTaskStyle(depTask);
                  const depRight = parseFloat(depStyle.left) + parseFloat(depStyle.width);
                  const depY = depIdx * 64 + 32;

                  // Simple path between tasks
                  return (
                    <path
                      key={`${task.id}-${depId}`}
                      d={`M ${(depRight / 100) * timelineWidth + 280} ${depY} C ${((depRight + 5) / 100) * timelineWidth + 280} ${depY}, ${((targetLeft - 5) / 100) * timelineWidth + 280} ${targetY}, ${(targetLeft / 100) * timelineWidth + 280} ${targetY}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray={depTask.status === 'Done' ? '0' : '4 2'}
                      className={`${depTask.status === 'Done' ? 'text-blue-400 opacity-40' : 'text-amber-400 opacity-60'}`}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                });
              })}
            </svg>

            {filteredTasks.map((task, idx) => {
              const assignee = users?.find(u => u.id === task.assigneeId);
              return (
                <div key={task.id} className={`flex group w-full border-b border-transparent hover:border-slate-100 dark:hover:border-slate-800 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30 dark:bg-slate-800/20'} hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors`}>
                  <div className={`w-[280px] sticky left-0 z-30 flex-shrink-0 flex items-center px-5 ${ROW_HEIGHT} border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group-hover:bg-blue-50/20 dark:group-hover:bg-slate-800/60 transition-colors`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
                    <span className={`mr-3.5 flex-shrink-0 transition-transform group-hover:scale-110 ${task.priority === 'Critical' ? 'text-rose-500' : 'text-blue-500'}`}>
                      {task.priority === 'Critical' ? <Zap size={16} className="fill-rose-500/20" /> : <Circle size={14} className="fill-blue-500/20" />}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1.5">
                      {task.isPrivate && <span title="Private Task"><Lock size={12} className="text-amber-500 flex-shrink-0" /></span>}
                      {task.title}
                    </span>
                  </div>

                  <div className="relative flex-shrink-0" style={{ width: timelineWidth, height: '64px' }}>
                    <div
                      className={`absolute h-[36px] top-1/2 -translate-y-1/2 rounded-full text-xs font-semibold flex items-center pr-4 pl-1.5 cursor-pointer transition-all duration-300 overflow-hidden shadow-sm group-hover:shadow-md group-hover:scale-[1.01] ring-1 ring-inset z-20 ${getStatusColor(task.status)}`}
                      style={getTaskStyle(task)}
                      title={`${task.title} • ${task.status}`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 pointer-events-none" />

                      {task.assigneeId && (
                        <div className="flex items-center w-max flex-shrink-0 bg-white/95 dark:bg-slate-800 rounded-full py-[3px] pr-3 pl-[3px] mr-2.5 shadow-sm border border-black/5 dark:border-white/10 z-10">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex flex-shrink-0 items-center justify-center text-[10px] text-white uppercase overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/10">
                            {assignee?.avatarUrl ? (
                              <img 
                                src={assignee.avatarUrl} 
                                alt={assignee.name} 
                                className="w-full h-full object-cover bg-white" 
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name)}&background=random`; }}
                              />
                            ) : (
                              <span className="font-bold tracking-wider drop-shadow-sm">{assignee ? assignee.name.substring(0, 2) : <UserIcon size={12} />}</span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold ml-2 text-slate-800 dark:text-slate-200 tracking-wide whitespace-nowrap">
                            {assignee?.name ? assignee.name.split(' ')[0] : 'Unassigned'}
                          </span>
                        </div>
                      )}
                      <span className="truncate tracking-wide drop-shadow-sm z-10 text-white font-medium">{task.title}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}