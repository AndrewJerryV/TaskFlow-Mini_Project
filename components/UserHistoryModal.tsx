'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Task, ActivityLog, User } from '@/types';
import { getActionDisplay } from '@/lib/utils';
import { Calendar, CheckCircle2, Clock, History, PieChart as PieIcon, Phone, Building } from 'lucide-react';
import { PieChart, TaskTimeline } from '@/components/ui/Charts';
import { useAuth } from '@/contexts/AuthContext';

interface UserHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export function UserHistoryModal({ isOpen, onClose, user }: UserHistoryModalProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'activity' | 'visuals'>('tasks');
    const { currentUser } = useAuth();
    const canViewHealth = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

    useEffect(() => {
        if (isOpen && user) {
            setLoading(true);
            fetch(`/api/users/${user.id}/history`)
                .then(res => res.json())
                .then(data => {
                    setTasks(data.tasks || []);
                    setLogs(data.logs || []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen, user]);

    // Calculate Pie Data
    const statusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = [
        { label: 'Done', value: statusCounts['Done'] || 0, color: '#10B981' }, // Green
        { label: 'In Progress', value: statusCounts['In Progress'] || 0, color: '#3B82F6' }, // Blue
        { label: 'Obstructed', value: statusCounts['Obstructed'] || 0, color: '#EF4444' }, // Red (mapped from obstructed status if any)
        { label: 'To Do', value: statusCounts['To Do'] || 0, color: '#9CA3AF' }, // Gray
    ];

    if (!user) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`History: ${user.name}`}>
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex flex-col md:flex-row gap-4 text-sm">
                <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Contact Details</h4>
                    <div className="space-y-1 text-gray-600 dark:text-gray-300">
                        {user.phone && (
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" /> {user.phone}
                            </div>
                        )}
                        {user.officeAddress && (
                            <div className="flex items-center gap-2">
                                <Building size={14} className="text-gray-400" /> {user.officeAddress}
                            </div>
                        )}
                        {(!user.phone && !user.officeAddress) && (
                            <span className="italic opacity-50">No contact info available</span>
                        )}
                    </div>
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Role & Health</h4>
                    <div className="space-y-1 text-gray-600 dark:text-gray-300">
                        <div>{user.role}</div>
                        {canViewHealth && (
                            <div className={`${user.wellnessScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {user.wellnessScore}% Wellness Score
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    Tasks ({tasks.length})
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Activity Log
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'visuals' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('visuals')}
                >
                    <div className="flex items-center justify-center gap-2">
                        <PieIcon size={14} />
                        Analytics
                    </div>
                </button>
            </div>

            <div className="min-h-[300px] max-h-[500px] overflow-y-auto p-1">
                {loading ? (
                    <div className="flex justify-center py-8 text-gray-500">Loading history...</div>
                ) : (
                    <>
                        {activeTab === 'tasks' && (
                            <div className="space-y-3">
                                {tasks.length === 0 ? (
                                    <p className="text-center text-gray-400 italic py-4">No tasks assigned.</p>
                                ) : (
                                    tasks.map(task => (
                                        <div key={task.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-medium text-sm text-gray-900 dark:text-white">{task.title}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${task.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-1 mb-2">{task.description}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                                <span className="flex items-center gap-1"><Calendar size={10} /> Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                                                {task.dueDate && <span className="flex items-center gap-1"><Clock size={10} /> Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="space-y-4">
                                {logs.length === 0 ? (
                                    <p className="text-center text-gray-400 italic py-4">No recent activity.</p>
                                ) : (
                                    logs.map(log => {
                                        const actionInfo = getActionDisplay(log.action);
                                        return (
                                            <div key={log.id} className="flex gap-3">
                                                <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${actionInfo.bgColor}`}>
                                                    <History size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-800 dark:text-gray-200">{log.details}</p>
                                                    <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'visuals' && (
                            <div className="space-y-8 py-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 text-center">Task Status Distribution</h3>
                                    <PieChart data={pieData} />
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                                    <TaskTimeline tasks={tasks} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
