// src/components/BoardView.tsx
'use client';

const columns = [
  { 
    title: 'TO DO', 
    count: 1, 
    items: [
      { id: 'SCRUM-1', content: 'Task 1', assignee: 'TW', priority: 'Medium' }
    ] 
  },
  { 
    title: 'IN PROGRESS', 
    count: 1, 
    items: [
      { id: 'SCRUM-2', content: 'Task 2', assignee: 'TW', priority: 'High' }
    ] 
  },
  { title: 'IN REVIEW', count: 0, items: [] },
  { title: 'DONE', count: 0, items: [] },
];

export default function BoardView() {
  return (
    <div className="flex h-full overflow-x-auto pb-4 space-x-4">
      {columns.map((col) => (
        <div key={col.title} className="flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-full">
          {/* Column Header */}
          <div className="p-3 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 rounded-t-lg z-10">
            <div className="flex items-center space-x-2">
              <span>{col.title}</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{col.count}</span>
            </div>
            <div className="flex space-x-1">
               <button className="hover:bg-gray-200 p-1 rounded">+</button>
               <button className="hover:bg-gray-200 p-1 rounded">•••</button>
            </div>
          </div>

          {/* Cards Container */}
          <div className="p-2 flex-1 overflow-y-auto space-y-2">
            {col.items.length > 0 ? (
              col.items.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group">
                  <div className="text-sm text-gray-800 mb-3">{item.content}</div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                       {/* Checkbox Icon */}
                       <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                       <span className="text-xs text-gray-500 hover:underline">{item.id}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                       {/* Priority Indicator (Up Arrow for High, Equals for Medium) */}
                       {item.priority === 'High' ? (
                          <span className="text-red-500 font-bold text-xs">↑</span>
                       ) : (
                          <span className="text-orange-400 font-bold text-xs">=</span>
                       )}
                       {/* Avatar */}
                       <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-[10px] text-white">
                         {item.assignee}
                       </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full min-h-[50px]"></div> // Drop zone placeholder
            )}
             {/* "Create" button at bottom of list */}
            <button className="flex items-center text-gray-500 hover:bg-gray-200 p-2 w-full rounded text-sm transition-colors">
              <span className="text-lg mr-2">+</span> Create
            </button>
          </div>
        </div>
      ))}
       {/* "Add Column" Button */}
       <div className="flex-shrink-0 w-12 pt-2">
          <button className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-gray-600 text-xl font-bold">
            +
          </button>
       </div>
    </div>
  );
}