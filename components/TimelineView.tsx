// src/components/TimelineView.tsx
'use client';

const months = ['Dec', 'Jan \'26', 'Feb \'26', 'Mar \'26', 'Apr \'26', 'May \'26'];

export default function TimelineView() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white h-[600px] flex flex-col">
      {/* 1. Filter Bar */}
      <div className="p-2 border-b border-gray-200 flex items-center space-x-3 bg-white z-20">
        <div className="relative">
          <input 
             type="text" 
             placeholder="Search timeline" 
             className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500 w-48"
          />
           <svg className="absolute w-4 h-4 text-gray-400 left-2 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <div className="flex -space-x-1">
            <div className="w-7 h-7 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center text-xs text-white z-10">TW</div>
             <div className="w-7 h-7 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-500 z-0">?</div>
        </div>
        <button className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-700">Status category ▾</button>
      </div>

      {/* 2. Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANE: Task List */}
        <div className="w-1/4 border-r border-gray-200 flex flex-col bg-white z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="h-10 border-b border-gray-200 flex items-center px-4 bg-gray-50 text-xs font-semibold text-gray-500">
            Work
          </div>
          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {/* Sprint Group Header */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600">
              Sprints
            </div>
            
            {/* Task Row */}
            <div className="flex items-center px-4 py-3 hover:bg-blue-50 border-l-4 border-l-transparent hover:border-l-blue-500 cursor-pointer border-b border-gray-100">
               <span className="text-purple-600 mr-2">⚡</span>
               <span className="text-sm text-gray-700 truncate">What needs to be done?</span>
            </div>
             {/* Add more placeholder rows here */}
             <div className="px-4 py-2 text-gray-400 text-sm hover:bg-gray-50 cursor-pointer flex items-center">
               <span className="mr-2">+</span> Create
             </div>
          </div>
        </div>

        {/* RIGHT PANE: Timeline Grid */}
        <div className="flex-1 flex flex-col overflow-x-auto relative">
          
          {/* Timeline Header (Months) */}
          <div className="h-10 flex border-b border-gray-200 bg-gray-50 min-w-[800px]">
            {months.map((m) => (
              <div key={m} className="flex-1 border-r border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500 uppercase">
                {m}
              </div>
            ))}
          </div>

          {/* Timeline Body (Grid Lines & Bars) */}
          <div className="flex-1 relative min-w-[800px] bg-white">
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
               {months.map((_, i) => (
                  <div key={i} className="flex-1 border-r border-dashed border-gray-200 h-full"></div>
               ))}
            </div>

            {/* Current Day Indicator Line (Blue) */}
            <div className="absolute top-0 bottom-0 border-l-2 border-blue-500 z-10" style={{ left: '28%' }}>
               <div className="w-2 h-2 bg-blue-500 rounded-full -ml-[5px] -mt-1"></div>
            </div>

            {/* Sprint Bar (Top Row) */}
            <div className="absolute top-0 w-full h-8 bg-gray-100 border-b border-gray-200">
               <div className="absolute top-1 h-6 bg-blue-100 border border-blue-300 rounded text-[10px] text-blue-700 flex items-center px-2 whitespace-nowrap"
                    style={{ left: '25%', width: '15%' }}>
                 SCRUM Sprint 0
               </div>
            </div>

            {/* Task Bars corresponding to the Left Pane rows */}
             <div className="absolute top-12 left-0 w-full">
               {/* Task 1 Bar */}
               <div className="relative h-8 w-full hover:bg-gray-50">
                  <div className="absolute top-1.5 h-5 bg-purple-200 rounded-md border border-purple-300 cursor-pointer hover:bg-purple-300 transition-colors"
                       style={{ left: '28%', width: '20%' }}>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Controls (Zoom/Today) */}
      <div className="p-2 border-t border-gray-200 flex justify-end space-x-2">
         <div className="flex bg-white border border-gray-300 rounded-md text-xs divide-x divide-gray-300 shadow-sm">
            <button className="px-3 py-1 hover:bg-gray-50 text-gray-600">Today</button>
            <button className="px-3 py-1 hover:bg-gray-50 text-gray-600">Weeks</button>
            <button className="px-3 py-1 bg-blue-50 text-blue-700 font-medium">Months</button>
            <button className="px-3 py-1 hover:bg-gray-50 text-gray-600">Quarters</button>
         </div>
      </div>
    </div>
  );
}