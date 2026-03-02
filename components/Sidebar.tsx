'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Plus, Settings, Users } from 'lucide-react';
import { CreateProjectDialog } from '@/components/forms/CreateProjectDialog';
import { useAuth } from '@/contexts/AuthContext';

export function Sidebar() {
    const { currentUser } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        if (currentUser?.id) {
            fetch(`/api/projects?userId=${currentUser.id}`)
                .then(res => res.json())
                .then(setProjects);
        }
    }, [currentUser?.id]);

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <CreateProjectDialog isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); fetch('/api/projects').then(res => res.json()).then(setProjects); }} />

            <div className="p-4 flex-1 overflow-y-auto">
                <div className="mb-6">
                    <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-3 px-2">Workspace</h2>
                    <ul className="space-y-1">
                        <li>
                            <Link href="/" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <LayoutGrid size={18} className="mr-3 text-gray-400 dark:text-gray-500" />
                                Dashboards
                            </Link>
                        </li>

                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                            <li>
                                <Link href="/team" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/team' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    <Users size={18} className="mr-3 text-gray-400 dark:text-gray-500" />
                                    Team
                                </Link>
                            </li>
                        )}
                        <li>
                            <Link href="/settings" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/settings' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <Settings size={18} className="mr-3 text-gray-400 dark:text-gray-500" />
                                Settings
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <div className="flex items-center justify-between px-2 mb-2 group">
                        <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Projects</h2>
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>

                    <ul className="space-y-1">
                        {projects.map(project => {
                            const isActive = pathname?.startsWith(`/projects/${project.id}`);
                            return (
                                <li key={project.id}>
                                    <Link
                                        href={`/projects/${project.id}`}
                                        className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className={`w-7 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white mr-3 ${isActive ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                            {project.key}
                                        </span>
                                        <span className="truncate">{project.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                        {projects.length === 0 && (
                            <li className="text-sm text-gray-400 dark:text-gray-500 px-2 italic">No projects found.</li>
                        )}
                    </ul>
                </div>
            </div>
        </aside>
    );
}
