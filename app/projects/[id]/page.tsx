'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, Task, Status } from '@/types';
import { TaskBoard } from '@/components/TaskBoard';
import SummaryView from '@/components/SummaryView';
import BacklogView from '@/components/BacklogView';
import TimelineView from '@/components/TimelineView';
import ChatView from '@/components/ChatView';
import PagesView from '@/components/PagesView';
import DeploymentsView from '@/components/DeploymentsView';
import CalendarView from '@/components/CalendarView';
import ReportsView from '@/components/ReportsView';
import ShortcutsView from '@/components/ShortcutsView';
import FormsView from '@/components/FormsView';
import CodeView from '@/components/CodeView';
import { CreateTaskDialog } from '@/components/forms/CreateTaskDialog';
import { Modal } from '@/components/ui/Modal';
import VideoRoom from '@/components/VideoRoom';
import { useAuth } from '@/contexts/AuthContext';
import { Video, Folder, FileText, BarChart3, Plus, UserPlus, Check, Rocket, Calendar, PieChart } from 'lucide-react';

// Nav Items definition
const NAV_ITEMS = ['Summary', 'Backlog', 'Board', 'Timeline', 'Code', 'Pages', 'Deployments', 'Calendar', 'Reports', 'Chat', 'Forms', 'Shortcuts'] as const;
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
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [projectMembers, setProjectMembers] = useState<string[]>([]);
    const { users, currentUser } = useAuth();

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

    if (loading) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading Workspace...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">Project not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900">
            {isVideoOpen && <VideoRoom projectId={id} onLeave={() => setIsVideoOpen(false)} />}

            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="w-9 h-8 flex items-center justify-center bg-blue-600 text-white rounded text-sm">{project.key}</span>
                        {project.name}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsVideoOpen(true)}
                        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        <Video size={16} /> Join Meeting
                    </button>
                    <div className="flex -space-x-2">
                        {/* Show project members */}
                        {projectMembers.slice(0, 3).map((memberId, idx) => {
                            const member = users.find(u => u.id === memberId);
                            return (
                                <div
                                    key={memberId}
                                    className="w-8 h-8 rounded-full border-2 border-white bg-indigo-500 text-white flex items-center justify-center text-xs font-medium"
                                    title={member?.name}
                                >
                                    {member?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                            );
                        })}
                        {projectMembers.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 text-white flex items-center justify-center text-xs">
                                +{projectMembers.length - 3}
                            </div>
                        )}
                        {/* Add member button */}
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs transition-colors"
                            title="Add team member"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(window.location.href)
                                    .then(() => alert('Project link copied to clipboard!'))
                                    .catch(() => alert('Failed to copy link'));
                            } else {
                                // Fallback for environments without clipboard API
                                prompt('Copy this link:', window.location.href);
                            }
                        }}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Share
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50/50 dark:bg-gray-800/50">
                <nav className="flex space-x-6 -mb-px">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item}
                            onClick={() => setActiveTab(item)}
                            className={`py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === item
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 bg-gray-50/30 dark:bg-gray-900 ${activeTab === 'Chat' || activeTab === 'Forms' || activeTab === 'Pages' ? 'overflow-hidden' : 'overflow-auto p-6'}`}>
                <CreateTaskDialog
                    isOpen={isCreateTaskOpen}
                    onClose={() => setIsCreateTaskOpen(false)}
                    currentProjectId={params.id as string}
                    onSubmit={handleTaskCreateSubmit}
                />

                {activeTab === 'Summary' && <SummaryView tasks={tasks} projectId={id} />}
                {activeTab === 'Backlog' && <BacklogView tasks={tasks} onTaskCreate={() => setIsCreateTaskOpen(true)} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />}

                {activeTab === 'Board' && <TaskBoard tasks={tasks} onTaskMove={handleTaskMove} />}
                {activeTab === 'Timeline' && <TimelineView tasks={tasks} />}
                {activeTab === 'Chat' && <ChatView projectId={id} />}

                {activeTab === 'Code' && (
                    <div className="h-[calc(100vh-220px)]">
                        <CodeView projectId={id} />
                    </div>
                )}

                {activeTab === 'Pages' && (
                    <PagesView projectId={id} />
                )}

                {activeTab === 'Deployments' && (
                    <DeploymentsView projectId={id} />
                )}

                {activeTab === 'Calendar' && (
                    <CalendarView projectId={id} tasks={tasks} />
                )}

                {activeTab === 'Reports' && (
                    <ReportsView projectId={id} tasks={tasks} />
                )}

                {activeTab === 'Forms' && (
                    <FormsView projectId={id} />
                )}

                {activeTab === 'Shortcuts' && (
                    <ShortcutsView projectId={id} />
                )}
            </div>

            {/* Invite Team Member Modal */}
            <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Add Team Members">
                <div className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select team members to add to this project:</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {users.filter(u => u.id !== currentUser?.id).map(user => {
                            const isMember = projectMembers.includes(user.id);
                            return (
                                <div
                                    key={user.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isMember ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        }`}
                                    onClick={() => {
                                        if (isMember) {
                                            setProjectMembers(prev => prev.filter(id => id !== user.id));
                                        } else {
                                            setProjectMembers(prev => [...prev, user.id]);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                    {isMember && (
                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setIsInviteOpen(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setIsInviteOpen(false);
                                alert(`Added ${projectMembers.length} member(s) to project!`);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
