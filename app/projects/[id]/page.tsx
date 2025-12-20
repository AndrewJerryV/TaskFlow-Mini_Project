'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, Task, Status } from '@/types';
import { TaskBoard } from '@/components/TaskBoard';
import SummaryView from '@/components/SummaryView';
import BacklogView from '@/components/BacklogView';
import TimelineView from '@/components/TimelineView';

// Nav Items definition
const NAV_ITEMS = ['Summary', 'Backlog', 'Board', 'Timeline', 'Code', 'Pages'] as const;
type Tab = typeof NAV_ITEMS[number];

// Placeholder for missing views
const Placeholder = ({ name }: { name: string }) => (
    <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
        <div className="text-4xl mb-4">🚧</div>
        <h3 className="text-lg font-medium text-gray-600">{name} View</h3>
        <p className="text-sm">This module is currently under development.</p>
    </div>
);

export default function ProjectPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('Board');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            // Fetch Tasks
            const tasksRes = await fetch(`/api/tasks?projectId=${id}`);
            const tasksData = await tasksRes.json();
            setTasks(tasksData);

            // Fetch Projects to find current one (Optimization: Create single project endpoint later)
            const projectsRes = await fetch('/api/projects');
            const projectsData = await projectsRes.json();
            const currentProject = projectsData.find((p: Project) => p.id === id);
            setProject(currentProject || null);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskMove = async (taskId: string, newStatus: Status) => {
        // Optimistic update
        const oldTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status: newStatus })
            });
        } catch (err) {
            console.error("Failed to update task", err);
            setTasks(oldTasks); // Revert
        }
    };

    const handleTaskCreate = async () => {
        // Basic creation for demo
        const title = prompt("Task Title:");
        if (!title) return;

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: id,
                    title,
                    priority: 'Medium',
                    // Default to current user in a real app
                    assigneeId: 'u1'
                })
            });
            const newTask = await res.json();
            setTasks(prev => [...prev, newTask]);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Workspace...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">Project not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white z-10">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                        <span>Projects</span>
                        <span>/</span>
                        <span>{project.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded text-sm">{project.key}</span>
                        {project.name}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-green-500 text-white flex items-center justify-center text-xs">A</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-gray-500 flex items-center justify-center text-xs">+</div>
                    </div>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                        Share
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 bg-gray-50/50">
                <nav className="flex space-x-6 -mb-px">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item}
                            onClick={() => setActiveTab(item)}
                            className={`py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === item
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto bg-gray-50/30 p-6">
                {activeTab === 'Summary' && <SummaryView tasks={tasks} />}
                {activeTab === 'Backlog' && <BacklogView tasks={tasks} onTaskCreate={handleTaskCreate} />}
                {activeTab === 'Board' && <TaskBoard tasks={tasks} onTaskMove={handleTaskMove} />}
                {activeTab === 'Timeline' && <TimelineView />}
                {activeTab === 'Code' && <Placeholder name="Code" />}
                {activeTab === 'Pages' && <Placeholder name="Pages" />}
            </div>
        </div>
    );
}
