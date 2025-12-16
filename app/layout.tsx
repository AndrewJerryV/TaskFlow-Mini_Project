// src/app/layout.tsx

import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TaskFlow Clone',
  description: 'A project management tool replica',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          {/* Main Layout Container */}
          <div className="flex-1 overflow-y-auto">
            <div className="h-12 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4">
              {/* Top Navbar Area (Search, Create, Premium Trial) */}
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">TaskFlow</h1>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search"
                    className="p-1 pl-8 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {/* Search Icon */}
                  <svg className="absolute w-4 h-4 text-gray-400 left-2 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  + Create
                </button>
                <button className="px-3 py-1 text-sm font-semibold text-purple-700 bg-purple-200 rounded-md hover:bg-purple-300">
                  Premium trial
                </button>
                {/* User Icon/Avatar */}
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              </div>
            </div>

            <div className="flex h-[calc(100vh-3rem)]">
              {/* Left Sidebar */}
              <aside className="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto">
                {/* Content for you, Spaces, Recent, etc. */}
                <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">For you</h2>
                <ul className="space-y-1 text-sm">
                  <li className="p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                    <span className="mr-2">+</span> Spaces
                  </li>
                  {/* ... other sidebar links */}
                  <li className="p-2 rounded-md bg-blue-100 text-blue-700 font-medium flex justify-between items-center">
                    <span>My Software Team</span>
                    <span>...</span>
                  </li>
                </ul>
              </aside>

              {/* Main Content Area */}
              <main className="flex-1 p-4 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}