// src/app/layout.tsx

import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

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
      <body className="font-sans">
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
                {/* User Icon/Avatar */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Andrew</span>
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">AM</div>
                </div>
              </div>
            </div>

            <div className="flex h-[calc(100vh-3rem)]">
              {/* Left Sidebar */}
              <Sidebar />

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