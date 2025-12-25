'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LogOut, Search, Folder, CheckSquare, X } from 'lucide-react';
import { getRoleColor } from '@/lib/utils';
import { Project, Task } from '@/types';

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

interface SearchResult {
    type: 'project' | 'task';
    id: string;
    title: string;
    subtitle?: string;
    projectId?: string;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const { currentUser, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isLoading && !currentUser && pathname !== '/login') {
            router.push('/login');
        }
    }, [currentUser, isLoading, router, pathname]);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search when query changes
    useEffect(() => {
        const searchData = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const query = searchQuery.toLowerCase();
                const results: SearchResult[] = [];

                // Fetch projects
                const projectsRes = await fetch('/api/projects');
                if (projectsRes.ok) {
                    const projects: (Project & { stats?: any })[] = await projectsRes.json();
                    projects
                        .filter(p => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
                        .slice(0, 5)
                        .forEach(p => {
                            results.push({
                                type: 'project',
                                id: p.id,
                                title: p.name,
                                subtitle: p.description
                            });
                        });
                }

                // Fetch tasks from all projects (or use a global endpoint if available)
                const tasksRes = await fetch('/api/tasks');
                if (tasksRes.ok) {
                    const tasks: Task[] = await tasksRes.json();
                    tasks
                        .filter(t => t.title.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query))
                        .slice(0, 5)
                        .forEach(t => {
                            results.push({
                                type: 'task',
                                id: t.id,
                                title: t.title,
                                subtitle: `${t.status} • ${t.priority}`,
                                projectId: t.projectId
                            });
                        });
                }

                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchData, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleResultClick = (result: SearchResult) => {
        if (result.type === 'project') {
            router.push(`/projects/${result.id}`);
        } else if (result.type === 'task' && result.projectId) {
            router.push(`/projects/${result.projectId}?task=${result.id}`);
        }
        setSearchQuery('');
        setShowResults(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

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
                        <div className="flex items-center gap-2">
                            <img src="/icon.svg" alt="TaskFlow" className="h-4 w-auto" />
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">TaskFlow</h1>
                        </div>
                        <div className="relative" ref={searchRef}>
                            <input
                                type="text"
                                placeholder="Search projects & tasks..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                className="w-64 p-1.5 pl-8 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            <Search className="absolute w-4 h-4 text-gray-400 left-2.5 top-1/2 transform -translate-y-1/2" />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X size={14} />
                                </button>
                            )}

                            {/* Search Results Dropdown */}
                            {showResults && searchQuery.length >= 2 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                            Searching...
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                            No results found for "{searchQuery}"
                                        </div>
                                    ) : (
                                        <div className="py-1">
                                            {searchResults.map((result) => (
                                                <button
                                                    key={`${result.type}-${result.id}`}
                                                    onClick={() => handleResultClick(result)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                                                >
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${result.type === 'project'
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                                        : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                                        }`}>
                                                        {result.type === 'project' ? <Folder size={16} /> : <CheckSquare size={16} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {result.title}
                                                        </p>
                                                        {result.subtitle && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {result.subtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">
                                                        {result.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
