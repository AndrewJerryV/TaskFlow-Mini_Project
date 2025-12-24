'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Task, Comment, Priority, Status } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Calendar, User as UserIcon, MessageSquare, Clock, Sparkles, ArrowRight, Edit } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
    const [newComment, setNewComment] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

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
                        <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>

                {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={editedTask.title}
                                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[100px]"
                                value={editedTask.description || ''}
                                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                            <select
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                                <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <UserIcon size={14} />
                                <span>Assignee: {task.assigneeId ? getUserName(users, task.assigneeId) : 'Unassigned'}</span>
                            </div>
                            {task.dueDate && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar size={14} />
                                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-600">
                                <Clock size={14} />
                                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs for Comments and History */}
                <div className="border-t pt-4">
                    <div className="flex gap-4 mb-3 border-b border-gray-100">
                        <button
                            className={`pb-2 text-sm font-medium ${activeTab === 'comments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('comments')}
                        >
                            <span className="flex items-center gap-2">
                                <MessageSquare size={14} />
                                Comments ({comments.length})
                            </span>
                        </button>
                        <button
                            className={`pb-2 text-sm font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
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
                                <div className="text-sm text-gray-400">Loading comments...</div>
                            ) : (
                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-medium text-gray-800">
                                                    {getUserName(users, comment.userId)}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{comment.content}</p>
                                        </div>
                                    ))}
                                    {comments.length === 0 && (
                                        <p className="text-sm text-gray-400 italic">No comments yet</p>
                                    )}
                                </div>
                            )}

                            {/* Add Comment */}
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {loadingHistory ? (
                                <div className="text-sm text-gray-400">Loading history...</div>
                            ) : history.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No history available</p>
                            ) : (
                                history.map((log: any) => (
                                    <div key={log.id} className="flex gap-3 text-sm">
                                        <div className={`mt-0.5 ${getActionDisplay(log.action).bgColor} w-6 h-6 rounded flex items-center justify-center`}>
                                            <ActionIcon iconName={getActionDisplay(log.action).iconName} size={12} />
                                        </div>
                                        <div>
                                            <p className="text-gray-900">
                                                <span className="font-medium">{getUserName(users, log.userId)}</span> {log.details.replace(`Task "${task.title}"`, 'Task').replace(task.title, 'this task')}
                                            </p>
                                            <p className="text-xs text-gray-400">
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
                <div className="flex justify-between items-center pt-4 border-t">
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                        <Trash2 size={14} />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>

                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => { setIsEditing(false); setEditedTask(task); }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
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
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
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
                </div>
            </div>
        </Modal>
    );
}
