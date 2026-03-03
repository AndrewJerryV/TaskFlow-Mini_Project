'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Task, Comment, Priority, Status } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Calendar, User as UserIcon, MessageSquare, Clock, Sparkles, ArrowRight, Edit, Play, Square } from 'lucide-react';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/constants';
import { getUserName, getActionDisplay } from '@/lib/utils';

// Icon component to render Lucide icons by name
const ActionIcon = ({ iconName, size = 14 }: { iconName: string; size?: number }) => {
    switch (iconName) {
        case 'Sparkles': return <Sparkles size={size} />;
        case 'ArrowRight': return <ArrowRight size={size} />;
        case 'Trash2': return <Trash2 size={size} />;
        case 'MessageSquare': return <MessageSquare size={size} />;
        case 'Edit': return <Edit size={size} />;
        default: return <Edit size={size} />;
    }
};

interface TaskDetailModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (task: Task) => void;
    onDelete: (taskId: string) => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
    const { currentUser, users } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState<Task | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'time'>('comments');
    const [newComment, setNewComment] = useState('');
    const [timeLogMinutes, setTimeLogMinutes] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const isMember = currentUser?.role === 'Member';

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (editedTask?.activeTimerStart) {
            interval = setInterval(() => {
                setCurrentTime(new Date());
            }, 60000); // UI update every minute is enough
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [editedTask?.activeTimerStart]);

    useEffect(() => {
        if (task) {
            setEditedTask(task);
            fetchComments(task.id);
            fetchHistory(task.id);
        }
    }, [task]);

    const fetchComments = async (taskId: string) => {
        setLoadingComments(true);
        try {
            const res = await fetch(`/api/comments?taskId=${taskId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const fetchHistory = async (taskId: string) => {
        if (!task) return;
        const taskTitle = task.title; // Capture before async
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/activity');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const taskLogs = data.filter((log: any) =>
                        log.entityId === taskId || log.details.includes(taskTitle)
                    );
                    setHistory(taskLogs);
                }
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSave = () => {
        if (editedTask) {
            onUpdate(editedTask);
            setIsEditing(false);
        }
    };

    const handleDelete = async () => {
        if (task && currentUser) {
            setIsDeleting(true);
            try {
                const res = await fetch(`/api/tasks/${task.id}?userId=${currentUser.id}`, {
                    method: 'DELETE',
                });
                if (res.ok) {
                    onDelete(task.id);
                    onClose();
                }
            } catch (error) {
                console.error('Error deleting task:', error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !task || !currentUser) return;

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    userId: currentUser.id,
                    content: newComment,
                }),
            });

            if (res.ok) {
                const comment = await res.json();
                setComments([...comments, comment]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleStartTimer = async () => {
        if (!task || !currentUser || !editedTask) return;

        const updatedTask = {
            ...editedTask,
            activeTimerStart: new Date().toISOString()
        };

        setEditedTask(updatedTask);
        onUpdate(updatedTask);
        setCurrentTime(new Date());
    };

    const handleStopTimer = async () => {
        if (!task || !currentUser || !editedTask || !editedTask.activeTimerStart) return;

        const startTime = new Date(editedTask.activeTimerStart);
        const endTime = new Date();
        const diffMs = endTime.getTime() - startTime.getTime();
        const elapsedMinutes = Math.max(1, Math.round(diffMs / 60000));

        const newTimeLog = {
            userId: currentUser.id,
            minutes: elapsedMinutes,
            date: endTime.toISOString()
        };

        const updatedTimeLogs = [...(editedTask.timeLogs || []), newTimeLog];

        const updatedTask = {
            ...editedTask,
            timeLogs: updatedTimeLogs,
            activeTimerStart: null
        };

        setEditedTask(updatedTask);
        onUpdate(updatedTask);
    };

    const handleAddTimeLog = async () => {
        if (!timeLogMinutes || isNaN(Number(timeLogMinutes)) || Number(timeLogMinutes) <= 0 || !task || !currentUser || !editedTask) return;

        const newTimeLog = {
            userId: currentUser.id,
            minutes: Number(timeLogMinutes),
            date: new Date().toISOString()
        };

        const updatedTimeLogs = [...(editedTask.timeLogs || []), newTimeLog];

        // Update local state immediately
        setEditedTask({ ...editedTask, timeLogs: updatedTimeLogs });

        // Save to backend via onUpdate (the parent component will handle API call)
        onUpdate({ ...editedTask, timeLogs: updatedTimeLogs });
        setTimeLogMinutes('');
    };

    if (!task || !editedTask) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Task' : task.title}>
            <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Header with badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[task.status]}`}>
                        {task.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                    </span>
                    {task.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>

                {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input
                                type="text"
                                disabled={isMember}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                value={editedTask.title}
                                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                disabled={isMember}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm min-h-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                value={editedTask.description || ''}
                                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                <select
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={editedTask.status}
                                    onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as Status })}
                                >
                                    <option value="To Do">To Do</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Review">Review</option>
                                    <option value="Done">Done</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                <select
                                    disabled={isMember}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    value={editedTask.priority}
                                    onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as Priority })}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
                            <select
                                disabled={isMember}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                value={editedTask.assigneeId || ''}
                                onChange={(e) => setEditedTask({ ...editedTask, assigneeId: e.target.value || undefined })}
                            >
                                <option value="">Unassigned</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    /* View Mode */
                    <div className="space-y-4">
                        {task.description && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <UserIcon size={14} />
                                <span>Assignee: {task.assigneeId ? getUserName(users, task.assigneeId) : 'Unassigned'}</span>
                            </div>
                            {task.dueDate && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Calendar size={14} />
                                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Clock size={14} />
                                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>

                            {/* Total Time Spent */}
                            {editedTask.timeLogs && editedTask.timeLogs.length > 0 && (
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                                    <Clock size={14} />
                                    <span>
                                        Time Spent:{' '}
                                        {Math.floor(editedTask.timeLogs.reduce((acc, log) => acc + log.minutes, 0) / 60)}h{' '}
                                        {editedTask.timeLogs.reduce((acc, log) => acc + log.minutes, 0) % 60}m
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tabs for Comments and History */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex gap-4 mb-3 border-b border-gray-100 dark:border-gray-700">
                        <button
                            className={`pb-2 text-sm font-medium ${activeTab === 'comments' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('comments')}
                        >
                            <span className="flex items-center gap-2">
                                <MessageSquare size={14} />
                                Comments ({comments.length})
                            </span>
                        </button>
                        <button
                            className={`pb-2 text-sm font-medium ${activeTab === 'time' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('time')}
                        >
                            <span className="flex items-center gap-2">
                                <Clock size={14} />
                                Time Logs ({editedTask?.timeLogs?.length || 0})
                            </span>
                        </button>
                        <button
                            className={`pb-2 text-sm font-medium ${activeTab === 'history' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            <span className="flex items-center gap-2">
                                <Clock size={14} />
                                History
                            </span>
                        </button>
                    </div>

                    {activeTab === 'comments' ? (
                        <>
                            {loadingComments ? (
                                <div className="text-sm text-gray-400 dark:text-gray-500">Loading comments...</div>
                            ) : (
                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {getUserName(users, comment.userId)}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{comment.content}</p>
                                        </div>
                                    ))}
                                    {comments.length === 0 && (
                                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comments yet</p>
                                    )}
                                </div>
                            )}

                            {/* Add Comment */}
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    ) : activeTab === 'time' ? (
                        <>
                            {/* Start/Stop Timer Controls */}
                            <div className="mb-4">
                                {editedTask.activeTimerStart ? (
                                    <button
                                        onClick={handleStopTimer}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 transition"
                                    >
                                        <Square size={16} fill="currentColor" />
                                        <span className="font-medium animate-pulse">
                                            Stop active timer ({Math.round((currentTime.getTime() - new Date(editedTask.activeTimerStart).getTime()) / 60000)}m)
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStartTimer}
                                        disabled={isMember && editedTask.assigneeId !== currentUser?.id}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        <Play size={16} fill="currentColor" />
                                        <span className="font-medium">Start Timer</span>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {editedTask.timeLogs?.map((log, index) => (
                                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {getUserName(users, log.userId)}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {new Date(log.date).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Logged {log.minutes} minutes</p>
                                    </div>
                                ))}
                                {(!editedTask.timeLogs || editedTask.timeLogs.length === 0) && (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No time logged yet</p>
                                )}
                            </div>

                            {/* Add Time Log */}
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Minutes spent..."
                                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    value={timeLogMinutes}
                                    onChange={(e) => setTimeLogMinutes(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTimeLog()}
                                />
                                <button
                                    onClick={handleAddTimeLog}
                                    disabled={!timeLogMinutes || isNaN(Number(timeLogMinutes)) || Number(timeLogMinutes) <= 0}
                                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    Log Time
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {loadingHistory ? (
                                <div className="text-sm text-gray-400 dark:text-gray-500">Loading history...</div>
                            ) : history.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No history available</p>
                            ) : (
                                history.map((log: any) => (
                                    <div key={log.id} className="flex gap-3 text-sm">
                                        <div className={`mt-0.5 ${getActionDisplay(log.action).bgColor} w-6 h-6 rounded flex items-center justify-center`}>
                                            <ActionIcon iconName={getActionDisplay(log.action).iconName} size={12} />
                                        </div>
                                        <div>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                <span className="font-medium">{getUserName(users, log.userId)}</span> {log.details.replace(`Task "${task.title}"`, 'Task').replace(task.title, 'this task')}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    {!isMember ? (
                        <>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm"
                            >
                                <Trash2 size={14} />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>

                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => { setIsEditing(false); setEditedTask(task); }}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                        >
                                            Save Changes
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                        >
                                            Edit
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="ml-auto flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
