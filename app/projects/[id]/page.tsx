'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, Task, Status } from '@/types';
import { TaskBoard } from '@/components/TaskBoard';
import SummaryView from '@/components/SummaryView';
import BacklogView from '@/components/BacklogView';
import TimelineView from '@/components/TimelineView';
import { CreateTaskDialog } from '@/components/forms/CreateTaskDialog';
import { ChatWidget } from '@/components/ChatWidget';
import VideoRoom from '@/components/VideoRoom';
import { Video } from 'lucide-react';

// Nav Items definition
const NAV_ITEMS = ['Summary', 'Backlog', 'Board', 'Timeline', 'Code', 'Pages'] as const;
type Tab = typeof NAV_ITEMS[number];

export default function ProjectPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('Board');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isVideoOpen, setIsVideoOpen] = useState(false);

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

            // Fetch Projects to find current one
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

    const handleTaskUpdate = async (updatedTask: Task) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

        try {
            await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTask)
            });
        } catch (err) {
            console.error("Failed to update task", err);
        }
    };

    const handleTaskCreateSubmit = async (taskData: Partial<Task>) => {
        const newTask: Task = {
            id: `temp-${Date.now()}`,
            projectId: id,
            title: taskData.title || 'Untitled',
            description: taskData.description || '',
            status: taskData.status || 'To Do',
            priority: taskData.priority || 'Medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            assigneeId: taskData.assigneeId || 'u1',
            startDate: taskData.startDate,
            dueDate: taskData.dueDate
        };

        const previousTasks = [...tasks];
        setTasks(prev => [...prev, newTask]);

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(newTask),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed');
            const realTask = await res.json();
            setTasks(prev => prev.map(t => t.id === newTask.id ? realTask : t));
        } catch (err) {
            console.error(err);
            setTasks(previousTasks);
        }
    };

    const handleTaskDelete = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Workspace...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">Project not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
            {isVideoOpen && <VideoRoom projectId={id} onLeave={() => setIsVideoOpen(false)} />}
            <ChatWidget projectId={id} />

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
                    <button
                        onClick={() => setIsVideoOpen(true)}
                        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        <Video size={16} /> Join Meeting
                    </button>
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-green-500 text-white flex items-center justify-center text-xs">A</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-gray-500 flex items-center justify-center text-xs">+</div>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert('Project link copied to clipboard!');
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
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
                <CreateTaskDialog
                    isOpen={isCreateTaskOpen}
                    onClose={() => setIsCreateTaskOpen(false)}
                    currentProjectId={params.id as string}
                    onSubmit={handleTaskCreateSubmit}
                />

                {activeTab === 'Summary' && <SummaryView tasks={tasks} />}
                {activeTab === 'Backlog' && <BacklogView tasks={tasks} onTaskCreate={() => setIsCreateTaskOpen(true)} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />}

                {activeTab === 'Board' && <TaskBoard tasks={tasks} onTaskMove={handleTaskMove} />}
                {activeTab === 'Timeline' && <TimelineView tasks={tasks} />}

                {activeTab === 'Code' && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-mono text-gray-600 flex justify-between">
                            <span>main</span>
                            <span>Last commit: 10 mins ago</span>
                        </div>
                        <div className="p-0">
                            {[
                                { name: 'src', type: 'dir', time: '2 hours ago' },
                                { name: 'public', type: 'dir', time: '2 hours ago' },
                                { name: 'package.json', type: 'file', time: 'yesterday' },
                                { name: 'README.md', type: 'file', time: '3 days ago' },
                            ].map((file, i) => (
                                <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer text-sm">
                                    <span className="w-6 text-gray-400">{file.type === 'dir' ? '📁' : '📄'}</span>
                                    <span className="flex-1 font-medium text-gray-700">{file.name}</span>
                                    <span className="text-gray-400 text-xs">{file.time}</span>
                                </div>
                            ))}
                            <div className="p-8 text-center text-gray-400 italic bg-gray-50/20">
                                Repository connection active
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Pages' && (
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md cursor-pointer group">
                            <div className="h-32 bg-gray-100 rounded-md mb-3 flex items-center justify-center text-4xl group-hover:bg-blue-50 transition-colors">📄</div>
                            <h3 className="font-semibold text-gray-800">Project Requirements</h3>
                            <p className="text-xs text-gray-500">Updated yesterday by User</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md cursor-pointer group">
                            <div className="h-32 bg-gray-100 rounded-md mb-3 flex items-center justify-center text-4xl group-hover:bg-blue-50 transition-colors">📊</div>
                            <h3 className="font-semibold text-gray-800">Q1 Marketing Strategy</h3>
                            <p className="text-xs text-gray-500">Updated 2 days ago</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center text-gray-400 cursor-pointer transition-colors">
                            <span className="text-2xl mb-1">+</span>
                            <span>Create Page</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
