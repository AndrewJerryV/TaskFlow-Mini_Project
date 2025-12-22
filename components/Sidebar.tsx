'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Plus, Settings, Users } from 'lucide-react';
import { CreateProjectDialog } from '@/components/forms/CreateProjectDialog';

export function Sidebar() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        fetch('/api/projects')
            .then(res => res.json())
            .then(setProjects);
        // Poll for updates or just simpler: trigger re-fetch on create? 
        // For prototype we rely on router.refresh() from the dialog actually triggering re-render if it was a server component, 
        // but here it is client state. We should expose a refresh method or just rely on mount.
        // Let's add an interval or just leave it for now.
    }, []);

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <CreateProjectDialog isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); fetch('/api/projects').then(res => res.json()).then(setProjects); }} />

            <div className="p-4 flex-1 overflow-y-auto">
                <div className="mb-6">
                    <h2 className="text-xs font-semibold uppercase text-gray-400 mb-3 px-2">Workspace</h2>
                    <ul className="space-y-1">
                        <li>
                            <Link href="/" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                <LayoutGrid size={18} className="mr-3 text-gray-400" />
                                Dashboards
                            </Link>
                        </li>
                        <li>
                            <Link href="#" className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
                                <Users size={18} className="mr-3 text-gray-400" />
                                People
                            </Link>
                        </li>
                        <li>
                            <Link href="#" className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
                                <Settings size={18} className="mr-3 text-gray-400" />
                                Settings
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <div className="flex items-center justify-between px-2 mb-2 group">
                        <h2 className="text-xs font-semibold uppercase text-gray-400">Projects</h2>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <ul className="space-y-1">
                        {projects.map(project => {
                            const isActive = pathname?.startsWith(`/projects/${project.id}`);
                            return (
                                <li key={project.id}>
                                    <Link
                                        href={`/projects/${project.id}`}
                                        className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white mr-3 ${isActive ? 'bg-blue-600' : 'bg-gray-400'}`}>
                                            {project.key}
                                        </span>
                                        <span className="truncate">{project.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                        {projects.length === 0 && (
                            <li className="text-sm text-gray-400 px-2 italic">No projects found.</li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                        AM
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">Andrew</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
