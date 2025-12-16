// src/components/BacklogView.tsx
'use client';

import React, { useState } from 'react';

// Mock data for Sprint and Backlog items
const sprintItems = [
  { id: 'SCRUM-1', summary: 'Task 1', status: 'TO DO', assignee: 'TW' },
  { id: 'SCRUM-2', summary: 'Task 2', status: 'IN PROGRESS', assignee: 'TW' },
];

const backlogItems = [
  { id: 'SCRUM-3', summary: 'Task 3', status: 'IN PROGRESS', assignee: 'TW' },
];

const TaskItem = ({ item }: { item: any }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 hover:bg-gray-50 transition-colors group cursor-move">
    <div className="flex items-center space-x-3">
      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
      <span className="text-gray-500 font-medium text-xs w-16">{item.id}</span>
      <span className="text-gray-900 text-sm font-medium">{item.summary}</span>
      {/* Edit Icon visible on hover */}
      <span className="opacity-0 group-hover:opacity-100 text-gray-400 cursor-pointer">
        ✏️
      </span>
    </div>
    
    <div className="flex items-center space-x-4">
      {/* Status Badge */}
      <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${
        item.status === 'TO DO' ? 'bg-gray-200 text-gray-700' : 
        item.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
      }`}>
        {item.status}
      </span>
      {/* Assignee Avatar */}
      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs text-white" title={item.assignee}>
        {item.assignee}
      </div>
       <div className="w-6 h-6 flex items-center justify-center text-gray-400 cursor-pointer">
         ⋮
       </div>
    </div>
  </div>
);

export default function BacklogView() {
  const [isSprintOpen, setIsSprintOpen] = useState(true);
  const [isBacklogOpen, setIsBacklogOpen] = useState(true);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Filters / Search Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
           <div className="relative">
             <input 
               type="text" 
               placeholder="Search backlog" 
               className="pl-2 pr-8 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
             />
           </div>
           <div className="flex -space-x-1">
              <div className="w-7 h-7 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center text-xs text-white">TW</div>
              <div className="w-7 h-7 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-500">+</div>
           </div>
        </div>
      </div>

      {/* Active Sprint Section */}
      <div className="bg-gray-50 rounded-lg p-2">
        <div 
          className="flex items-center justify-between mb-2 cursor-pointer" 
          onClick={() => setIsSprintOpen(!isSprintOpen)}
        >
          <div className="flex items-center font-semibold text-sm text-gray-700">
            <span className={`mr-2 transform transition-transform ${isSprintOpen ? 'rotate-90' : ''}`}>›</span>
            SCRUM Sprint 0 
            <span className="ml-2 text-gray-400 font-normal text-xs">16 Dec - 30 Dec (2 work items)</span>
          </div>
          <div className="flex space-x-2 text-xs">
            <span className="bg-gray-200 px-2 py-1 rounded">0</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">0</span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">0</span>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded">Complete sprint</button>
            <button className="text-gray-500 px-1">•••</button>
          </div>
        </div>
        
        {isSprintOpen && (
          <div className="space-y-[-1px]"> {/* Negative margin to merge borders */}
            {sprintItems.map(item => <TaskItem key={item.id} item={item} />)}
            <button className="w-full text-left p-2 pl-9 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              + Create issue
            </button>
          </div>
        )}
      </div>

      {/* Backlog Section */}
      <div className="bg-gray-50 rounded-lg p-2">
        <div 
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => setIsBacklogOpen(!isBacklogOpen)}
        >
          <div className="flex items-center font-semibold text-sm text-gray-700">
             <span className={`mr-2 transform transition-transform ${isBacklogOpen ? 'rotate-90' : ''}`}>›</span>
             Backlog 
             <span className="ml-2 text-gray-400 font-normal text-xs">(1 work item)</span>
          </div>
          <div className="flex space-x-2 text-xs">
             <span className="bg-gray-200 px-2 py-1 rounded">0</span>
             <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">0</span>
             <span className="bg-green-100 text-green-700 px-2 py-1 rounded">0</span>
             <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded">Create sprint</button>
          </div>
        </div>

        {isBacklogOpen && (
          <div className="space-y-[-1px]">
             {backlogItems.map(item => <TaskItem key={item.id} item={item} />)}
             <button className="w-full text-left p-2 pl-9 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              + Create issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}