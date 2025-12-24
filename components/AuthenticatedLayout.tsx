'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LogOut } from 'lucide-react';
import { getRoleColor } from '@/lib/utils';

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const { currentUser, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !currentUser && pathname !== '/login') {
            router.push('/login');
        }
    }, [currentUser, isLoading, router, pathname]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
        );
    }

    // Don't show layout for login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    if (!currentUser) {
        return null; // Will redirect to login
    }

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto">
                {/* Top Navbar */}
                <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between px-4">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">TaskFlow</h1>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search"
                                className="p-1 pl-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            <svg className="absolute w-4 h-4 text-gray-400 left-2 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(currentUser.role)}`}>
                                {currentUser.role}
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.name}</span>
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center font-semibold overflow-hidden">
                                {currentUser.avatarUrl ? (
                                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    currentUser.name.charAt(0)
                                )}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex h-[calc(100vh-3rem)]">
                    <Sidebar />
                    <main className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
