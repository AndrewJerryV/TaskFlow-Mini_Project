'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
const NAV_ITEMS = ['Recommendations', 'Summary', 'Backlog', 'Board', 'Timeline', 'Code', 'Pages', 'Deployments', 'Calendar', 'Reports', 'Chat', 'Forms', 'Shortcuts'] as const;
type Tab = typeof NAV_ITEMS[number];

import MLTaskRecommendations from '@/components/MLTaskRecommendations';
import { calculateAge } from '@/lib/utils';

export default function ProjectPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const [tabLoaded, setTabLoaded] = React.useState(false);

    const [activeTab, setActiveTab] = useState<Tab>('Board');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isMembersListOpen, setIsMembersListOpen] = useState(false);
    const [projectMembers, setProjectMembers] = useState<string[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [lastSyncTime, setLastSyncTime] = useState(0);
    const [hasNewFormsActivity, setHasNewFormsActivity] = useState(false);
    const { users, currentUser } = useAuth();
    // ... (rest of the component state and effects remain the same until the return statement)

    // Load saved tab from localStorage on mount (client-side only)
    useEffect(() => {
        if (id && typeof window !== 'undefined') {
            const stored = localStorage.getItem(`project-${id}-activeTab`);
            if (stored && NAV_ITEMS.includes(stored as Tab)) {
                setActiveTab(stored as Tab);
            }
            setTabLoaded(true);
        }
    }, [id]);

    // Custom handler to change tab and save to localStorage
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (id && typeof window !== 'undefined') {
            localStorage.setItem(`project-${id}-activeTab`, tab);
            if (tab === 'Forms') {
                setHasNewFormsActivity(false);
                // We'll update the seen count to the current count in the background or right away if we had it, but for simplicity, we do another fetch or just let the next polling update it.
                fetch(`/api/projects/${id}/forms-activity`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.count !== undefined) {
                            localStorage.setItem(`project-${id}-seenFormResponsesCount`, data.count.toString());
                        }
                    })
                    .catch(console.error);
            }
        }
    };

    const fetchData = useCallback(async (silent = false) => {
        if (!id || !currentUser) return;
        try {
            if (!silent) setLoading(true);
            // Fetch Tasks
            const tasksRes = await fetch(`/api/tasks?projectId=${id}&userId=${currentUser?.id}`);
            if (!tasksRes.ok) {
                try {
                    const errData = await tasksRes.json();
                    console.error("API error fetching tasks:", errData);
                } catch (e) {
                    console.error("API error fetching tasks (non-JSON):", tasksRes.status);
                }
                setTasks([]);
            } else {
                const tasksData = await tasksRes.json();
                if (Array.isArray(tasksData)) {
                    setTasks(tasksData);
                } else {
                    console.error("Tasks response is not an array:", tasksData);
                    setTasks([]);
                }
            }

            // Fetch Projects to find current one
            const projectsRes = await fetch(`/api/projects?userId=${currentUser?.id}`);
            const projectsData = await projectsRes.json();

            if (Array.isArray(projectsData)) {
                const currentProject = projectsData.find((p: Project) => p.id === id);
                if (!currentProject) {
                    setProject(null);
                    setTimeout(() => router.push('/'), 3000);
                } else {
                    setProject(currentProject);
                }
            }

            // Fetch Project Members
            // If we recently updated members manually (within last 5 seconds), skip background sync
            if (!silent || Date.now() - lastSyncTime > 5000) {
                const membersRes = await fetch(`/api/projects/${id}/members`);
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    setProjectMembers(membersData);
                    // Only sync selected members if modal is NOT open to avoid overwriting user selection
                    if (!isInviteOpen) {
                        setSelectedMembers(membersData);
                    } else if (silent) {
                        console.log("Background sync: Modal is open, skipping selectedMembers update to preserve user input.");
                    }
                }
            }

            // Check Forms Activity for Notifications
            const formsActivityRes = await fetch(`/api/projects/${id}/forms-activity`);
            if (formsActivityRes.ok) {
                const activityData = await formsActivityRes.json();
                if (activityData.count !== undefined) {
                    const seenCountStr = localStorage.getItem(`project-${id}-seenFormResponsesCount`);
                    const seenCount = seenCountStr ? parseInt(seenCountStr, 10) : 0;

                    if (activityData.count > seenCount && activeTab !== 'Forms') {
                        setHasNewFormsActivity(true);
                    } else if (activeTab === 'Forms' && activityData.count > seenCount) {
                        // User is currently viewing forms, automatically update seen count
                        localStorage.setItem(`project-${id}-seenFormResponsesCount`, activityData.count.toString());
                        setHasNewFormsActivity(false);
                    }
                }
            }

        } catch (err) {
            console.error("API error fetching data:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id, currentUser, isInviteOpen, lastSyncTime, router]);

    useEffect(() => {
        if (id && currentUser?.id) {
            fetchData();
        }
    }, [id, currentUser?.id, fetchData]);

    useEffect(() => {
        if (id && currentUser?.id) {
            // Setup polling every 3 seconds
            const interval = setInterval(() => {
                fetchData(true);
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [id, currentUser?.id, fetchData]);

    const handleTaskMove = async (taskId: string, newStatus: Status) => {
        // Optimistic update
        const oldTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id == taskId ? { ...t, status: newStatus } : t));

        try {
            const res = await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status: newStatus, userId: currentUser?.id })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update task');
            }
            const updatedTask = await res.json();
            setTasks(prev => prev.map(t => t.id == taskId ? updatedTask : t));
        } catch (err: any) {
            console.error("Failed to update task", err);
            alert(err.message || "Failed to update task");
            setTasks(oldTasks); // Revert
        }
    };

    const handleTaskUpdate = async (updatedTask: Task) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id == updatedTask.id ? updatedTask : t));

        try {
            const res = await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...updatedTask, userId: currentUser?.id })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update task');
            }
            const realTask = await res.json();
            setTasks(prev => prev.map(t => t.id == realTask.id ? realTask : t));

            // Alert if new member was auto-added during update
            if (updatedTask.assigneeId && !projectMembers.includes(updatedTask.assigneeId)) {
                const addedUser = users.find(u => u.id === updatedTask.assigneeId);
                const userName = addedUser ? addedUser.name : 'The assigned user';
                alert(`${userName} was automatically added to the project members list!`);
                fetchData(true);
            }
        } catch (err: any) {
            console.error("Failed to update task", err);
            alert(err.message || "Failed to update task");
            // Optionally revert update
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
            assigneeId: taskData.assigneeId || undefined,
            startDate: taskData.startDate,
            dueDate: taskData.dueDate
        };

        const previousTasks = [...tasks];
        setTasks(prev => [...prev, newTask]);

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify({ ...newTask, userId: currentUser?.id }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed');
            }
            const realTask = await res.json();
            setTasks(prev => prev.map(t => t.id === newTask.id ? realTask : t));

            // Alert if new member was auto-added
            if (taskData.assigneeId && !projectMembers.includes(taskData.assigneeId)) {
                const addedUser = users.find(u => u.id === taskData.assigneeId);
                const userName = addedUser ? addedUser.name : 'The assigned user';
                alert(`${userName} was automatically added to the project members list!`);
                // Trigger a sync of project members
                fetchData(true);
            }
        } catch (err) {
            console.error(err);
            setTasks(previousTasks);
        }
    };

    const handleTaskDelete = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    if (loading) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading Workspace...</div>;
    if (!project) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-10 bg-gray-50 dark:bg-gray-900">
            <div className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-full">
                <BarChart3 size={48} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied or Project Not Found</h1>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                You don't have permission to view this project, or it doesn't exist.
                You will be redirected to the dashboard in a few seconds...
            </p>
            <button
                onClick={() => router.push('/')}
                className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
                Back to Dashboard
            </button>
        </div>
    );

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
                    <div className="flex items-center gap-2">
                        <div
                            className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setIsMembersListOpen(true)}
                            title="View all project members"
                        >
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
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 text-white flex items-center justify-center text-xs bg-opacity-90">
                                    +{projectMembers.length - 3}
                                </div>
                            )}
                        </div>
                        {/* Add member button */}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                            <button
                                onClick={() => {
                                    setSelectedMembers([...projectMembers]);
                                    setIsInviteOpen(true);
                                }}
                                className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs transition-colors"
                                title="Add team member"
                            >
                                <Plus size={14} />
                            </button>
                        )}
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
                    <div className="flex space-x-6 overflow-x-auto no-scrollbar">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item}
                                onClick={() => handleTabChange(item)}
                                className={`py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap relative ${activeTab === item
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    {item}
                                    {item === 'Forms' && hasNewFormsActivity && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-0.5" title="New Activity"></span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 bg-gray-50/30 dark:bg-gray-900 ${activeTab === 'Chat' || activeTab === 'Forms' || activeTab === 'Pages' || activeTab === 'Calendar' ? 'overflow-hidden' : 'overflow-auto p-6'}`}>
                <CreateTaskDialog
                    isOpen={isCreateTaskOpen}
                    onClose={() => setIsCreateTaskOpen(false)}
                    currentProjectId={params.id as string}
                    onSubmit={handleTaskCreateSubmit}
                />

                {activeTab === 'Recommendations' && <MLTaskRecommendations tasks={tasks} projectId={id} users={users} currentUser={currentUser} onTaskUpdate={handleTaskUpdate} />}
                {activeTab === 'Summary' && <SummaryView tasks={tasks} projectId={id} currentUser={currentUser} />}
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
                        {users.filter(u => u.role !== 'Admin').map(user => {
                            const isSelected = selectedMembers.includes(user.id);
                            return (
                                <div
                                    key={user.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        }`}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedMembers(prev => prev.filter(id => id !== user.id));
                                        } else {
                                            setSelectedMembers(prev => [...prev, user.id]);
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
                                    {isSelected && (
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
                            onClick={async () => {
                                console.log("Done button clicked. Selected members:", selectedMembers);
                                try {
                                    const res = await fetch(`/api/projects/${id}/members`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userIds: selectedMembers, requestUserId: currentUser?.id })
                                    });

                                    console.log("Member update response status:", res.status);

                                    if (res.ok) {
                                        const updatedMembers = await res.json();
                                        console.log("Member update successful. Updated members:", updatedMembers);
                                        setProjectMembers(updatedMembers);
                                        setSelectedMembers(updatedMembers);
                                        setLastSyncTime(Date.now());
                                        setIsInviteOpen(false);
                                        // Use a slight delay before alert to ensure state updates are processed
                                        setTimeout(() => alert(`Project members updated!`), 100);
                                    } else {
                                        let errorMsg = 'Failed to update members';
                                        try {
                                            const data = await res.json();
                                            errorMsg = data.error || errorMsg;
                                        } catch (e) { }
                                        console.error("Member update error:", errorMsg);
                                        alert(`Error: ${errorMsg}`);
                                    }
                                } catch (err) {
                                    console.error("Connection error in member update:", err);
                                    alert('Failed to update members - check console for details');
                                }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Project Members List Modal */}
            <Modal isOpen={isMembersListOpen} onClose={() => setIsMembersListOpen(false)} title="Project Members">
                <div className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">All members on this project, organized by seniority (join date and role).</p>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                        {projectMembers
                            .map(id => users.find(u => u.id === id))
                            .filter(Boolean)
                            .sort((a, b) => {
                                // 1. Try to sort by createdAt ascending (older is more senior)
                                if (a!.createdAt && b!.createdAt && a!.createdAt !== b!.createdAt) {
                                    return new Date(a!.createdAt).getTime() - new Date(b!.createdAt).getTime();
                                }
                                // 2. If same date or missing, sort by role (Admin > Manager > Member)
                                const roleWeight = { 'Admin': 3, 'Manager': 2, 'Member': 1 };
                                if (roleWeight[a!.role] !== roleWeight[b!.role]) {
                                    return roleWeight[b!.role] - roleWeight[a!.role];
                                }
                                // 3. Fallback to name alphabetic
                                return (a!.name || '').localeCompare(b!.name || '');
                            })
                            .map((user, idx) => (
                                <div key={user!.id} className="flex items-start gap-4 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-200 dark:border-indigo-800 relative">
                                        {user!.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 max-w-full">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate" title={user!.name}>{user!.name}</p>
                                                {(() => {
                                                    const age = calculateAge(user!.dob);
                                                    if (age !== null) {
                                                        return (
                                                            <>
                                                                <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">•</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{age} yrs</span>
                                                            </>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${user!.role === 'Admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                user!.role === 'Manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {user!.role}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user!.email}</p>

                                        {user!.skills && user!.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {user!.skills.map(s => {
                                                    const exp = user!.skillExperience ? user!.skillExperience[s] : undefined;
                                                    return (
                                                        <span key={s} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                                            {s}
                                                            {exp !== undefined && (
                                                                <span className="text-gray-400 dark:text-gray-500 font-medium opacity-70">({exp}y)</span>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                        {projectMembers.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No members found in this project.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
