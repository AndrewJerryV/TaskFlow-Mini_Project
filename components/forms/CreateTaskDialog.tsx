'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Priority, Status, Task, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentProjectId: string;
    onSubmit: (task: Partial<Task>) => void;
}

export function CreateTaskDialog({ isOpen, onClose, currentProjectId, onSubmit }: CreateTaskDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Status>('To Do');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    const { currentUser } = useAuth();
    const isMember = currentUser?.role === 'Member';

    // Users list from API
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReasoning, setAiReasoning] = useState<string | null>(null);
    const [aiRisk, setAiRisk] = useState<'Low' | 'Medium' | 'High'>('Low');
    const dataRef = React.useRef<any>(null); // Store full response for debug

    // Fetch users when dialog opens
    useEffect(() => {
        if (isOpen) {
            setLoadingUsers(true);
            fetch('/api/users')
                .then(res => res.json())
                .then(data => {
                    setUsers(data);
                    // Set default assignee to first user if available
                    if (isMember && currentUser) {
                        setAssigneeId(currentUser.id);
                    } else if (data.length > 0 && !assigneeId) {
                        setAssigneeId(data[0].id);
                    }
                })
                .catch(console.error)
                .finally(() => setLoadingUsers(false));
        }
    }, [isOpen]);

    const handleSmartAssign = async () => {
        if (!title) {
            alert('Please enter a summary first so the AI can analyze requirements.');
            return;
        }

        setIsAnalyzing(true);
        setAiReasoning(null);

        try {
            const res = await fetch('/api/ai/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            dataRef.current = data;
            setAssigneeId(data.candidateId);
            setAiReasoning(data.reasoning);
            // Check if reasoning string contains "High burnout risk" or similar keywords if distinct field not sent
            // But we can parse the risk from the response if we included it in the root or details
            // The API returns `allCandidates` with risk, let's look at the first one
            const topCandidate = data.allCandidates?.[0];
            if (topCandidate) setAiRisk(topCandidate.risk);

        } catch (error) {
            console.error(error);
            alert('Failed to get AI suggestion');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) return;

        const newTask: Partial<Task> = {
            projectId: currentProjectId,
            title,
            description,
            // ... existing code ...
            status,
            priority,
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
            assigneeId,
            tags: [], // Could add tag input later
            isPrivate: isMember ? false : isPrivate,
        };

        onSubmit(newTask);
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setStatus('To Do');
        setStartDate('');
        setDueDate('');
        setAiReasoning(null);
        setIsPrivate(false);
    };

    // Get selected user's skills for display
    const selectedUser = users.find(u => u.id === assigneeId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Issue">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="What needs to be done?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                {/* AI / Smart Assign Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-blue-900 dark:text-blue-100">Assignee</label>
                        <button
                            type="button"
                            onClick={handleSmartAssign}
                            disabled={isAnalyzing || isMember}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 text-white transition-colors ${isAnalyzing || isMember ? 'bg-blue-300 dark:bg-blue-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90'}`}
                        >
                            {isAnalyzing ? 'Analyzing...' : '✨ Smart Assign'}
                        </button>
                    </div>

                    <div className="flex gap-2 mb-2">
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
                            value={assigneeId}
                            onChange={e => setAssigneeId(e.target.value)}
                            disabled={loadingUsers || isMember}
                        >
                            {loadingUsers ? (
                                <option>Loading users...</option>
                            ) : users.length === 0 ? (
                                <option>No users available</option>
                            ) : isMember ? (
                                <option value={currentUser.id}>{currentUser.name} (Me)</option>
                            ) : (
                                users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role}) - {user.skills?.slice(0, 3).join(', ') || 'No skills'}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Show selected user's skills */}
                    {selectedUser && selectedUser.skills && selectedUser.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {selectedUser.skills.map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}

                    {aiReasoning && (
                        <div className="space-y-2">
                            <div className={`text-xs p-2 rounded ${aiRisk === 'High' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                <strong>AI Insight:</strong> {aiReasoning.split(/(\*\*.*?\*\*)/g).map((part, index) => (
                                    part.startsWith('**') && part.endsWith('**')
                                        ? <strong key={index} className="font-medium text-gray-900">{part.slice(2, -2)}</strong>
                                        : <span key={index}>{part}</span>
                                ))}
                            </div>
                            {/* Debug View for User Feedback */}
                            <div className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                <strong>Debug Scores:</strong>
                                {(dataRef.current?.allCandidates || []).map((c: any) => (
                                    <div key={c.name} className="flex justify-between">
                                        <span>{c.name}</span>
                                        <span>
                                            Score: {c.score} ({c.risk})
                                            {c.matchingSkills?.length > 0 && ` • Skills: ${c.matchingSkills.join(', ')}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] dark:bg-gray-700 dark:text-white"
                        placeholder="Add details..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" value={status} onChange={e => setStatus(e.target.value as Status)}>
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                        <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                </div>

                {!isMember && (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            id="isPrivate"
                        />
                        <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Private Task (Only visible to assigned member and Managers/Admins)
                        </label>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <input
                            type="text"
                            onFocus={(e) => e.target.type = 'date'}
                            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                            placeholder="dd-mm-yyyy"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                        <input
                            type="text"
                            onFocus={(e) => e.target.type = 'date'}
                            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                            placeholder="dd-mm-yyyy"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Create</button>
                </div>
            </form>
        </Modal>
    );
}
