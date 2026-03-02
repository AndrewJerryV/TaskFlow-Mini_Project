'use client';

import React, { useState } from 'react';
import { Task, Priority, Status, User } from '@/types';
import { CheckSquare, Square, Plus, Edit2, MoreVertical, Search, PlayCircle, Layers } from 'lucide-react';
import { TaskFilters } from './TaskFilters';
import { TaskDetailModal } from './TaskDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { getStatusColorBacklog, getPriorityColor } from '@/lib/utils';

interface BacklogViewProps {
  tasks: Task[];
  onTaskCreate?: () => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

// Editable Task Item Component
const TaskItem = ({
  item,
  users,
  onUpdate,
  onClick,
  onDelete,
  currentUserRole,
}: {
  item: Task,
  users?: User[],
  onUpdate?: (t: Task) => void,
  onClick?: (t: Task) => void,
  onDelete?: (taskId: string) => void,
  currentUserRole?: string,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    if (title !== item.title && onUpdate) {
      onUpdate({ ...item, title });
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Only trigger onClick if we're not in editing mode and no menu is open
    if (!isEditing && !showMenu) {
      onClick?.(item);
    }
  };

  return (
    <div
      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group cursor-pointer relative"
      onClick={handleRowClick}
    >
      <div className="flex items-center space-x-3 flex-1">
        {item.status === 'Done' ? (
          <CheckSquare className="w-4 h-4 text-green-500 dark:text-green-400" />
        ) : (
          <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
        <span className="text-gray-500 dark:text-gray-400 font-medium text-xs w-16 truncate font-mono" title={item.id}>{item.id.substring(0, 6)}</span>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="text-sm font-medium border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-blue-500"
          />
        ) : (
          <span className="text-gray-900 dark:text-white text-sm font-medium">
            {item.title}
          </span>
        )}

        {currentUserRole !== 'Member' && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity"
          >
            <Edit2 size={12} />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <span className={`px-2 py-0.5 text-xs font-bold capitalize rounded ${getStatusColorBacklog(item.status)}`}>
          {item.status}
        </span>

        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(item.priority)}`}>
          {item.priority}
        </span>

        {item.assigneeId && (
          <div
            className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs text-white uppercase"
            title={users?.find(u => u.id === item.assigneeId)?.name || 'Assigned'}
          >
            {users?.find(u => u.id === item.assigneeId)?.name?.charAt(0) || item.assigneeId.charAt(0)}
          </div>
        )}
        <div className="relative">
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          >
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-1 min-w-[120px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { onClick?.(item); setShowMenu(false); }}
              >
                View Details
              </button>
              {currentUserRole !== 'Member' && (
                <>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  >
                    Edit Title
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => { onDelete?.(item.id); setShowMenu(false); }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function BacklogView({ tasks, onTaskCreate, onTaskUpdate, onTaskDelete }: BacklogViewProps) {
  const { users, currentUser } = useAuth();
  const [isSprintOpen, setIsSprintOpen] = useState(true);
  const [isBacklogOpen, setIsBacklogOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (assigneeFilter === 'unassigned' && task.assigneeId) return false;
    if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && task.assigneeId !== assigneeFilter) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group tasks
  const sprintTasks = filteredTasks.filter(t => t.status === 'In Progress' || t.status === 'Done' || t.status === 'Review');
  const backlogTasks = filteredTasks.filter(t => t.status === 'To Do');

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    onTaskUpdate?.(updatedTask);
    setSelectedTask(updatedTask);
  };

  const handleTaskDelete = (taskId: string) => {
    onTaskDelete?.(taskId);
    setIsDetailOpen(false);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />

      {/* Filters Component with Search */}
      <TaskFilters
        users={users}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onClearFilters={clearFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Active Sprint Section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer select-none"
          onClick={() => setIsSprintOpen(!isSprintOpen)}
        >
          <div className="flex items-center font-semibold text-sm text-gray-700 dark:text-gray-300 gap-2">
            <PlayCircle size={14} className={isSprintOpen ? "text-blue-600" : "text-gray-400"} />
            Active Sprint
            <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal text-xs">({sprintTasks.length} items)</span>
          </div>
          <div className="flex space-x-2 text-xs">
            <button className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded shadow-sm transition-all">Complete sprint</button>
          </div>
        </div>

        {isSprintOpen && (
          <div className="space-y-[-1px] mt-2">
            {sprintTasks.map(item => (
              <TaskItem key={item.id} item={item} users={users} onUpdate={onTaskUpdate} onClick={handleTaskClick} onDelete={handleTaskDelete} currentUserRole={currentUser?.role} />
            ))}
            {sprintTasks.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">No tasks in sprint</p>
            )}
            {currentUser?.role !== 'Member' && (
              <button onClick={onTaskCreate} className="w-full text-left p-2 pl-3 mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded">
                <Plus size={14} /> Create issue
              </button>
            )}
          </div>
        )}
      </div>

      {/* Backlog Section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer select-none"
          onClick={() => setIsBacklogOpen(!isBacklogOpen)}
        >
          <div className="flex items-center font-semibold text-sm text-gray-700 dark:text-gray-300 gap-2">
            <Layers size={14} className="text-gray-400" />
            Backlog
            <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal text-xs">({backlogTasks.length} items)</span>
          </div>
        </div>

        {isBacklogOpen && (
          <div className="space-y-[-1px] mt-2">
            {backlogTasks.map(item => (
              <TaskItem key={item.id} item={item} users={users} onUpdate={onTaskUpdate} onClick={handleTaskClick} onDelete={handleTaskDelete} currentUserRole={currentUser?.role} />
            ))}
            {backlogTasks.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">No tasks in backlog</p>
            )}
            {currentUser?.role !== 'Member' && (
              <button onClick={onTaskCreate} className="w-full text-left p-2 pl-3 mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded">
                <Plus size={14} /> Create issue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}