'use client';

import React from 'react';
import { Task } from '@/types';

const StatusChart = ({ tasks }: { tasks: Task[] }) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const todo = tasks.filter(t => t.status === 'To Do').length;

  return (
    <div className="flex flex-col items-center justify-center mr-6">
      {/* Container for the donut chart */}
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <path
            className="text-gray-200"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
          <path
            className="text-blue-500"
            strokeDasharray={`${(inProgress / total) * 100}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
        </svg>
        {/* Center Number */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-3xl font-bold text-gray-800">{total}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500 mt-2">Total work items</span>
    </div>
  )
};

const ActivityItem = ({ description, time }: { description: string, time: string }) => (
  <div className="flex space-x-3 text-sm py-2">
    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
    <div>
      <p className="text-gray-900 font-medium">{description}</p>
      <p className="text-xs text-gray-500">{time}</p>
    </div>
  </div>
);

export default function SummaryView({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const todo = tasks.filter(t => t.status === 'To Do').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
      {/* 1. Status Overview Card */}
      <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Status overview</h2>
        <div className="flex flex-col sm:flex-row items-center">
          <StatusChart tasks={tasks} />
          <div className="space-y-3 mt-4 sm:mt-0 w-full">
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              {done} completed
            </div>
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              {inProgress} In Progress
            </div>
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-3 h-3 bg-gray-300 rounded-full mr-2"></span>
              {todo} To Do
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recent Activity Card */}
      <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent activity</h2>
        <div className="space-y-2">
          <ActivityItem
            description="System updated status on tasks"
            time="Just now"
          />
        </div>
      </div>

      {/* Placeholder stats for layout parity */}
      <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Types of work</h2>
        <p className="text-sm text-gray-400">Task breakdown visualization...</p>
      </div>

    </div>
  );
}