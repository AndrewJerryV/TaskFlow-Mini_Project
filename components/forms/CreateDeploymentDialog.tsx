'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Deployment, Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface CreateDeploymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentProjectId: string;
    onDeploymentCreated: () => void;
}

export function CreateDeploymentDialog({ isOpen, onClose, currentProjectId, onDeploymentCreated }: CreateDeploymentDialogProps) {
    const [version, setVersion] = useState('');
    const [environment, setEnvironment] = useState<Deployment['environment']>('Development');
    const [status, setStatus] = useState<Deployment['status']>('Completed');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { currentUser } = useAuth();

    useEffect(() => {
        if (isOpen && currentProjectId && currentUser) {
            // Fetch tasks for the project to display as linkable options
            fetch(`/api/tasks?projectId=${currentProjectId}&userId=${currentUser.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setTasks(data);
                    }
                })
                .catch(console.error);
        }
    }, [isOpen, currentProjectId, currentUser]);

    const handleTaskToggle = (taskId: string) => {
        const newSet = new Set(selectedTaskIds);
        if (newSet.has(taskId)) {
            newSet.delete(taskId);
        } else {
            newSet.add(taskId);
        }
        setSelectedTaskIds(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!version.trim() || !currentUser) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/deployments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProjectId,
                    userId: currentUser.id,
                    version,
                    environment,
                    status,
                    releaseNotes,
                    taskIds: Array.from(selectedTaskIds)
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create deployment');
            }

            onDeploymentCreated();
            onClose();
            // Reset form
            setVersion('');
            setEnvironment('Development');
            setStatus('Completed');
            setReleaseNotes('');
            setSelectedTaskIds(new Set());
        } catch (error: any) {
            console.error('Error creating deployment:', error);
            alert(error.message || 'Failed to create deployment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log Deployment">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version Number <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g. v1.2.0"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Environment</label>
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                            value={environment}
                            onChange={e => setEnvironment(e.target.value as Deployment['environment'])}
                        >
                            <option value="Development">Development</option>
                            <option value="Staging">Staging</option>
                            <option value="Production">Production</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                            value={status}
                            onChange={e => setStatus(e.target.value as Deployment['status'])}
                        >
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Release Notes</label>
                    <textarea
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] dark:bg-gray-700 dark:text-white"
                        placeholder="What changed in this deployment?"
                        value={releaseNotes}
                        onChange={(e) => setReleaseNotes(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link Tasks</label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                        {tasks.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">No tasks found</p>
                        ) : (
                            tasks.map(task => (
                                <label key={task.id} className="flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                                        checked={selectedTaskIds.has(task.id)}
                                        onChange={() => handleTaskToggle(task.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{task.status} • {task.priority}</p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50">
                        {isSubmitting ? 'Logging...' : 'Log Deployment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
