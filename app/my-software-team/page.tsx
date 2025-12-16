// src/app/my-software-team/page.tsx

'use client';

import { useState } from 'react';
import SummaryView from '../../components/SummaryView';
import BoardView from '../../components/BoardView';
import BacklogView from '../../components/BacklogView';
import TimelineView from '../../components/TimelineView';
import type { ComponentType } from 'react';

const navItems = [
  { name: 'Summary', component: SummaryView },
  { name: 'Backlog', component: BacklogView },
  { name: 'Board', component: BoardView },
  { name: 'Code', component: 'CodeView' },
  { name: 'Timeline', component: TimelineView },
  { name: 'Pages', component: 'PagesView' },
  { name: 'Forms', component: 'FormsView' },
] as const;

// Define a fallback component for placeholders
const Placeholder = ({ name }: { name: string }) => (
  <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
    {name} Placeholder - Under Construction
  </div>
);

export default function MySoftwareTeamPage() {
  const [activeTab, setActiveTab] = useState('Summary');

  const ActiveComponent = navItems.find(item => item.name === activeTab)?.component;

  // Guard against undefined or string values
  if (!ActiveComponent) {
    return null; // or a default UI
  }

  return (
    <div className="p-4">
      {/* Project Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">My Software Team</h1>
        <div className="flex space-x-2 text-gray-500">
          {/* Placeholder for icons: Share, Settings, etc. */}
          <span>...</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-200">
        <div className="flex space-x-4 -mb-px">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`py-2 px-1 text-sm font-medium transition-colors duration-150 ${
                activeTab === item.name
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Content Area */}
      <div className="mt-4">
        {typeof ActiveComponent === 'string' ? (
          <Placeholder name={ActiveComponent} />
        ) : (
          <ActiveComponent />
        )}
      </div>
    </div>
  );
}