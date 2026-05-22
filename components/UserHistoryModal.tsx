'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Task, ActivityLog, User } from '@/types';
import { getActionDisplay } from '@/lib/utils';
import { Calendar, CheckCircle2, Clock, History, PieChart as PieIcon, Phone, Building, Shield, HeartPulse, Pencil, Mail, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { PieChart, TaskTimeline } from '@/components/ui/Charts';
import { useAuth } from '@/contexts/AuthContext';
<<<<<<< HEAD
import { apiFetch } from '@/lib/api/fetchWithSupabase';
=======
import { useAlert } from '@/contexts/AlertContext';
>>>>>>> 311f979 (feat: Refactor native browser alerts to use custom AlertContext UI overlays)

interface UserHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onEditSkills?: () => void;
    onUserDeleted?: () => void;
}

export function UserHistoryModal({ isOpen, onClose, user, onEditSkills, onUserDeleted }: UserHistoryModalProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'activity' | 'visuals'>('tasks');

    // Deletion Flow State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { currentUser } = useAuth();
    const { showAlert } = useAlert();
    const isAdmin = currentUser?.role === 'Admin';
    const canViewHealth = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

    const handleDeleteRequest = async () => {
        if (!user || !currentUser?.email) return;
        setIsSendingOtp(true);
        setDeleteError(null);
        try {
            const res = await apiFetch(`/api/users/${user.id}/delete/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminEmail: currentUser.email })
            });
            const data = await res.json();
            if (data.success) {
                setShowDeleteConfirm(true);
                showAlert('Verification code sent to your email', 'info');
            } else {
                const errorMsg = data.error || 'Failed to send OTP';
                setDeleteError(errorMsg);
                showAlert(errorMsg, 'error');
            }
        } catch (err) {
            setDeleteError('Network error while sending OTP');
            showAlert('Network error while sending OTP', 'error');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyAndDelete = async () => {
        if (!user || !currentUser?.email || !otpValue) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const res = await apiFetch(`/api/users/${user.id}/delete/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminEmail: currentUser.email,
                    otp: otpValue
                })
            });
            const data = await res.json();
            if (data.success) {
                showAlert('User deleted successfully', 'success');
                onUserDeleted?.();
                onClose();
            } else {
                const errorMsg = data.error || 'Invalid OTP';
                setDeleteError(errorMsg);
                showAlert(errorMsg, 'error');
            }
        } catch (err) {
            setDeleteError('Network error during deletion');
            showAlert('Network error during deletion', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (isOpen && user) {
            setLoading(true);
            apiFetch(`/api/users/${user.id}/history`)
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
        <Modal isOpen={isOpen} onClose={onClose} title={`History: ${user.name}`} maxWidth="max-w-4xl">

            {/* OTP Verification Overlay */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-[70] bg-white/95 dark:bg-gray-900/95 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <div className="max-w-md w-full space-y-6 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Deletion</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            A 6-digit verification code has been sent to <span className="font-semibold text-gray-900 dark:text-gray-100">{currentUser?.email}</span>. Please enter it below to permanently delete <b>{user.name}</b>.
                        </p>

                        <div className="space-y-4">
                            <input
                                type="text"
                                maxLength={6}
                                value={otpValue}
                                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-red-500 dark:focus:border-red-500 transition-all outline-none"
                            />

                            {deleteError && (
                                <p className="text-xs text-red-500 font-medium">{deleteError}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setOtpValue('');
                                        setDeleteError(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerifyAndDelete}
                                    disabled={otpValue.length !== 6 || isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-200 dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting && <Loader2 size={16} className="animate-spin" />}
                                    {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                                </button>
                            </div>

                            <button
                                onClick={handleDeleteRequest}
                                disabled={isSendingOtp}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                            >
                                Resend Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="mb-6 relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 dark:from-blue-900/20 dark:via-gray-900 dark:to-blue-900/10 p-5 rounded-xl border border-blue-100/60 dark:border-blue-800/30 shadow-sm flex flex-col md:flex-row gap-6 text-sm transition-all duration-300 hover:shadow-md group/card">
                {/* Decorative background glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl group-hover/card:bg-blue-400/15 transition-all duration-500 pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-3xl group-hover/card:bg-indigo-400/15 transition-all duration-500 pointer-events-none"></div>

                <div className="flex-1 space-y-3 relative z-10">
                    <h4 className="font-semibold tracking-wider text-[11px] uppercase text-blue-800/80 dark:text-blue-300/80 mb-3 flex items-center gap-2">
                        <span>Contact Details</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-200/60 to-transparent dark:from-blue-800/60"></div>
                    </h4>
                    <div className="space-y-3 text-gray-700 dark:text-gray-300">
                        {user.email && (
                            <div className="flex items-start gap-3 group">
                                <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                                    <Mail size={14} className="text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="font-medium pt-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors break-all">{user.email}</span>
                            </div>
                        )}
                        {user.phone && (
                            <div className="flex items-start gap-3 group">
                                <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                                    <Phone size={14} className="text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="font-medium pt-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{user.phone}</span>
                            </div>
                        )}
                        {user.officeAddress && (
                            <div className="flex items-start gap-3 group">
                                <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors mt-0.5">
                                    <Building size={14} className="text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="leading-relaxed pt-0.5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{user.officeAddress}</span>
                            </div>
                        )}
                        {(!user.email && !user.phone && !user.officeAddress) && (
                            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                <span className="italic text-xs text-gray-500 dark:text-gray-400">No contact info available</span>
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="pt-2 mt-4 border-t border-red-100/50 dark:border-red-900/20">
                            <button
                                onClick={handleDeleteRequest}
                                disabled={isSendingOtp}
                                className="w-full flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-xs font-bold border border-red-100 dark:border-red-900/30 shadow-sm disabled:opacity-50"
                            >
                                {isSendingOtp ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                DELETE USER
                            </button>
                        </div>
                    )}
                </div>

                {/* Divider for md screens */}
                <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-blue-200/50 dark:via-blue-800/50 to-transparent relative z-10"></div>

                <div className="flex-1 space-y-3 relative z-10">
                    <h4 className="font-semibold tracking-wider text-[11px] uppercase text-blue-800/80 dark:text-blue-300/80 mb-3 flex items-center gap-2">
                        <span>Role & Health</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-200/60 to-transparent dark:from-blue-800/60"></div>
                    </h4>
                    <div className="space-y-4 text-gray-700 dark:text-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                <Shield size={14} className="text-indigo-500 dark:text-indigo-400" />
                                <span className="text-indigo-700 dark:text-indigo-300 font-semibold text-xs tracking-wide">{user.role}</span>
                            </div>
                        </div>

                        {canViewHealth && (
                            <div className="flex items-center">
                                <div className="group relative w-full sm:w-auto flex items-center gap-3 p-2.5 pr-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all">
                                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900/50">
                                        <svg className="w-10 h-10 transform -rotate-90">
                                            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3.5" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                                            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3.5" fill="transparent"
                                                strokeDasharray={100.53} strokeDashoffset={100.53 - (100.53 * user.wellnessScore) / 100}
                                                className={`transition-all duration-1000 ease-out ${user.wellnessScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}
                                                strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className={`text-[10px] font-bold ${user.wellnessScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {user.wellnessScore}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <HeartPulse size={12} className={user.wellnessScore >= 80 ? 'text-emerald-500' : 'text-amber-500'} />
                                            <span className={`text-xs font-bold tracking-wide ${user.wellnessScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                Wellness
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                            {user.wellnessScore >= 80 ? 'Optimal' : 'Needs attention'}
                                        </span>
                                    </div>

                                    {/* Tooltip-like subtle highlight on hover */}
                                    <div className="absolute inset-0 rounded-xl bg-blue-500/5 dark:bg-blue-400/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                                </div>
                            </div>
                        )}


                    </div>
                </div>

                {/* Vertical Divider for md screens */}
                <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-blue-200/50 dark:via-blue-800/50 to-transparent relative z-10"></div>

                <div className="flex-1 space-y-3 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold tracking-wider text-[11px] uppercase text-blue-800/80 dark:text-blue-300/80 flex items-center gap-2">
                            <span>Skills & Expertise</span>
                        </h4>
                        {isAdmin && onEditSkills && (
                            <button
                                onClick={onEditSkills}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold"
                            >
                                <Pencil size={12} />
                                EDIT
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {user.skills && user.skills.length > 0 ? (
                            user.skills.map((skill, idx) => {
                                const exp = user.skillExperience?.[skill];
                                return (
                                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {skill}
                                        {exp !== undefined && (
                                            <span className="text-gray-400 dark:text-gray-500 font-bold border-l border-gray-100 dark:border-gray-700 pl-1.5 ml-0.5">{exp}y</span>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 w-full text-center justify-center">
                                <span className="italic text-xs text-gray-500 dark:text-gray-400">No skills listed</span>
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
