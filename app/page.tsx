// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Your Work</h1>

      {/* Recent Projects Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Recent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Project Card: My Software Team */}
          <Link href="/my-software-team" className="block group">
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer h-32 flex flex-col justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white text-lg font-bold">
                  ST
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">My Software Team</h3>
                  <p className="text-sm text-gray-500">Software Project</p>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                QUICK LINKS: <span className="hover:underline">My open issues</span> • <span className="hover:underline">Done issues</span>
              </div>
            </div>
          </Link>

          {/* Placeholder Project Card 2 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 h-32 flex flex-col justify-between opacity-60">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center text-white text-lg font-bold">
                MP
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mobile App</h3>
                <p className="text-sm text-gray-500">Classic Business</p>
              </div>
            </div>
          </div>

          {/* Create New Project Card */}
          <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-32 flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
            <span className="text-2xl mb-1">+</span>
            <span className="text-sm font-medium">Create Project</span>
          </button>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Worked on recently</h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-100">
            
            {/* Activity Item 1 */}
            <div className="p-4 flex items-center hover:bg-gray-50 cursor-pointer">
              <div className="w-8 h-8 mr-4 flex items-center justify-center bg-blue-100 text-blue-600 rounded-sm">
                📝
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">SCRUM-1: Set up project repository</p>
                <p className="text-xs text-gray-500">My Software Team • Updated 2 hours ago</p>
              </div>
            </div>

            {/* Activity Item 2 */}
            <div className="p-4 flex items-center hover:bg-gray-50 cursor-pointer">
              <div className="w-8 h-8 mr-4 flex items-center justify-center bg-green-100 text-green-600 rounded-sm">
                ✅
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">SCRUM-2: Design database schema</p>
                <p className="text-xs text-gray-500">My Software Team • Updated 5 hours ago</p>
              </div>
            </div>

             {/* Activity Item 3 */}
             <div className="p-4 flex items-center hover:bg-gray-50 cursor-pointer">
              <div className="w-8 h-8 mr-4 flex items-center justify-center bg-purple-100 text-purple-600 rounded-sm">
                🚀
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">SCRUM-3: Deploy initial build</p>
                <p className="text-xs text-gray-500">My Software Team • Created yesterday</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}