'use client';

import React, { useState } from 'react';
import { Task } from '@/types';
import { CheckSquare, Plus, Edit2, MoreVertical, Search, Filter, PlayCircle, Layers } from 'lucide-react';

interface BacklogViewProps {
  tasks: Task[];
  onTaskCreate?: () => void;
  onTaskUpdate?: (task: Task) => void;
}

// Editable Task Item Component
const TaskItem = ({ item, onUpdate }: { item: Task, onUpdate?: (t: Task) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);

  const handleSave = () => {
    setIsEditing(false);
    if (title !== item.title && onUpdate) {
      onUpdate({ ...item, title });
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 hover:bg-gray-50 transition-colors group cursor-default">
      <div className="flex items-center space-x-3 flex-1">
        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
        <span className="text-gray-500 font-medium text-xs w-16 truncate font-mono" title={item.id}>{item.id.substring(0, 6)}</span>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="text-sm font-medium border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span className="text-gray-900 text-sm font-medium cursor-text" onClick={() => setIsEditing(true)}>
            {item.title}
          </span>
        )}

        {/* Edit Icon */}
        <button onClick={() => setIsEditing(!isEditing)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity">
          <Edit2 size={12} />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${item.status === 'To Do' ? 'bg-gray-100 text-gray-600' :
            item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
          {item.status}
        </span>

        {item.assigneeId && (
          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs text-white uppercase">
            {item.assigneeId.charAt(0)}
          </div>
        )}
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical size={14} />
        </button>
      </div>
    </div>
  );
};

export default function BacklogView({ tasks, onTaskCreate, onTaskUpdate }: BacklogViewProps) {
  const [isSprintOpen, setIsSprintOpen] = useState(true);
  const [isBacklogOpen, setIsBacklogOpen] = useState(true);

  // Group tasks
  const sprintTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'Done');
  const backlogTasks = tasks.filter(t => t.status === 'To Do');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Filters / Search Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search backlog"
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
            />
          </div>
          <div className="flex -space-x-1 pl-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs text-white">TW</div>
            <div className="w-7 h-7 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-300 transition-colors">
              <Plus size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Sprint Section */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer select-none"
          onClick={() => setIsSprintOpen(!isSprintOpen)}
        >
          <div className="flex items-center font-semibold text-sm text-gray-700 gap-2">
            <PlayCircle size={14} className={isSprintOpen ? "text-blue-600" : "text-gray-400"} />
            Active Sprint
            <span className="ml-2 text-gray-400 font-normal text-xs">({sprintTasks.length} items)</span>
          </div>
          <div className="flex space-x-2 text-xs">
            <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded shadow-sm transition-all">Complete sprint</button>
          </div>
        </div>

        {isSprintOpen && (
          <div className="space-y-[-1px] mt-2">
            {sprintTasks.map(item => <TaskItem key={item.id} item={item} onUpdate={onTaskUpdate} />)}
            <button onClick={onTaskCreate} className="w-full text-left p-2 pl-3 mt-1 flex items-center gap-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors rounded">
              <Plus size={14} /> Create issue
            </button>
          </div>
        )}
      </div>

      {/* Backlog Section */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer select-none"
          onClick={() => setIsBacklogOpen(!isBacklogOpen)}
        >
          <div className="flex items-center font-semibold text-sm text-gray-700 gap-2">
            <Layers size={14} className="text-gray-400" />
            Backlog
            <span className="ml-2 text-gray-400 font-normal text-xs">({backlogTasks.length} items)</span>
          </div>
        </div>

        {isBacklogOpen && (
          <div className="space-y-[-1px] mt-2">
            {backlogTasks.map(item => <TaskItem key={item.id} item={item} onUpdate={onTaskUpdate} />)}
            <button onClick={onTaskCreate} className="w-full text-left p-2 pl-3 mt-1 flex items-center gap-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors rounded">
              <Plus size={14} /> Create issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}