// src/components/SummaryView.tsx
'use client';

const StatusChart = () => (
  <div className="flex flex-col items-center justify-center mr-6">
    {/* Container for the donut chart */}
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
        {/* Background Circle (Gray) */}
        <path
          className="text-gray-200"
          d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.8"
        />
        {/* Blue Segment (50%) */}
        <path
          className="text-blue-500"
          strokeDasharray="50, 100"
          d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.8"
        />
        {/* Green Segment (25%) - starting where blue ended (at 50%) */}
        <path
          className="text-green-400"
          strokeDasharray="25, 100"
          strokeDashoffset="-50" 
          d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.8"
        />
      </svg>
      {/* Center Number */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-3xl font-bold text-gray-800">4</span>
      </div>
    </div>
    <span className="text-xs font-medium text-gray-500 mt-2">Total work items</span>
  </div>
);

const ActivityItem = ({ description, time }: { description: string, time: string }) => (
  <div className="flex space-x-3 text-sm py-2">
    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
    <div>
      <p className="text-gray-900 font-medium">{description}</p>
      <p className="text-xs text-gray-500">{time}</p>
    </div>
  </div>
);

export default function SummaryView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
      {/* 1. Status Overview Card */}
      <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Status overview</h2>
        <div className="flex flex-col sm:flex-row items-center">
          <StatusChart />
          <div className="space-y-3 mt-4 sm:mt-0 w-full">
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              0 completed
            </div>
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              2 In Progress
            </div>
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-3 h-3 bg-gray-300 rounded-full mr-2"></span>
              2 To Do
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recent Activity Card */}
      <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent activity</h2>
        <div className="space-y-2">
          <ActivityItem
            description="Teal Will updated field 'Sprint' on SCRUM-2: Task 2"
            time="4 minutes ago"
          />
          <ActivityItem
            description="Teal Will updated field 'status' on SCRUM-4: Subtask 2.1"
            time="10 minutes ago"
          />
          <ActivityItem
            description="Teal Will created SCRUM-1: Task 1"
            time="15 minutes ago"
          />
        </div>
      </div>

      {/* 3. Types of Work Card */}
      <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Types of work</h2>
        <div className="space-y-5">
          <div className="text-sm">
            <div className="flex justify-between mb-1">
                <p className="font-medium text-gray-700">Task</p>
                <p className="font-medium text-gray-500">50%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>
          <div className="text-sm">
             <div className="flex justify-between mb-1">
                <p className="font-medium text-gray-700">Story</p>
                <p className="font-medium text-gray-500">25%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 4. Priority Breakdown */}
      <div className="col-span-1 md:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
         <h2 className="text-lg font-bold text-gray-800 mb-4">Priority breakdown</h2>
         <div className="h-40 bg-gray-50 border border-gray-100 flex items-end justify-around p-4 rounded-md">
            <div className="text-center group cursor-pointer">
              <div className="w-12 bg-red-500 rounded-t-sm transition-all group-hover:bg-red-600" style={{height: '80px'}}></div>
              <span className="text-xs font-semibold text-gray-600 mt-2 block">Highest</span>
            </div>
             <div className="text-center group cursor-pointer">
              <div className="w-12 bg-orange-400 rounded-t-sm transition-all group-hover:bg-orange-500" style={{height: '60px'}}></div>
              <span className="text-xs font-semibold text-gray-600 mt-2 block">High</span>
            </div>
             <div className="text-center group cursor-pointer">
              <div className="w-12 bg-yellow-400 rounded-t-sm transition-all group-hover:bg-yellow-500" style={{height: '40px'}}></div>
              <span className="text-xs font-semibold text-gray-600 mt-2 block">Medium</span>
            </div>
             <div className="text-center group cursor-pointer">
              <div className="w-12 bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600" style={{height: '20px'}}></div>
              <span className="text-xs font-semibold text-gray-600 mt-2 block">Low</span>
            </div>
         </div>
      </div>
    </div>
  );
}