'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Video, ExternalLink, X, Copy, Check, Users, Settings, Save, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { apiFetch } from '@/lib/api/fetchWithSupabase';

interface VideoRoomProps {
    projectId: string;
    onLeave: () => void;
}

export default function VideoRoom({ projectId, onLeave }: VideoRoomProps) {
    const { currentUser } = useAuth();
    const canManageMeeting = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const [copied, setCopied] = useState(false);
    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
    const [editingUrl, setEditingUrl] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch stored meeting URL
    useEffect(() => {
        async function fetchMeetingUrl() {
            try {
                const res = await apiFetch(`/api/meeting?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setMeetingUrl(data.meetingUrl);
                    setEditingUrl(data.meetingUrl || '');
                }
            } catch (error) {
                console.error('Error fetching meeting URL:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchMeetingUrl();
        // Safety timeout — if API is slow, stop loading after 3s
        const timeout = setTimeout(() => setLoading(false), 3000);
        return () => clearTimeout(timeout);
    }, [projectId]);

    const saveMeetingUrl = async () => {
        setSaving(true);
        try {
            let url = editingUrl.trim();
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            const success = await db.setMeetingUrl(projectId, url || null);
            if (success) {
                setMeetingUrl(url || null);
                setEditingUrl(url || '');
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error saving meeting URL:', error);
        } finally {
            setSaving(false);
        }
    };

    const removeMeetingUrl = async () => {
        setSaving(true);
        try {
            const success = await db.setMeetingUrl(projectId, null);
            if (success) {
                setMeetingUrl(null);
                setEditingUrl('');
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error removing meeting URL:', error);
        } finally {
            setSaving(false);
        }
    };

    const joinMeeting = () => {
        if (meetingUrl) {
            window.open(meetingUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const copyLink = async () => {
        if (!meetingUrl) return;
        try {
            await navigator.clipboard.writeText(meetingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            prompt('Copy this meeting link:', meetingUrl);
        }
    };

    const createNewMeet = () => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-5 relative">
                    <button
                        onClick={onLeave}
                        className="absolute top-3 right-3 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Video size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-lg">Google Meet</h2>
                            <p className="text-white/70 text-sm">Video meeting for your team</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        </div>
                    ) : meetingUrl && !isEditing ? (
                        /* Meeting link is set — show join button */
                        <>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users size={16} className="text-green-600 dark:text-green-400" />
                                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">Project Meeting</h3>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate" title={meetingUrl}>
                                    {meetingUrl}
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={joinMeeting}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                        Join Meeting
                                    </button>
                                    <button
                                        onClick={copyLink}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                        title="Copy meeting link"
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={14} className="text-green-500" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Edit / Remove — Admin & Manager only */}
                            {canManageMeeting && (
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <Settings size={14} />
                                        Change link
                                    </button>
                                    <button
                                        onClick={removeMeetingUrl}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                            )}
                        </>
                    ) : canManageMeeting ? (
                        /* No meeting link set — show setup (Admin/Manager only) */
                        <>
                            <div className="text-center py-2">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Video size={28} className="text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                    {isEditing ? 'Update Meeting Link' : 'Set Up Meeting'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Add a Google Meet link for your team
                                </p>
                            </div>

                            {/* Step 1: Create a meet */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Step 1: Create a Google Meet
                                </p>
                                <button
                                    onClick={createNewMeet}
                                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    Open Google Meet
                                </button>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                    Go to meet.google.com/new, then copy the meeting link
                                </p>
                            </div>

                            {/* Step 2: Paste link */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Step 2: Paste the meeting link
                                </label>
                                <input
                                    type="url"
                                    value={editingUrl}
                                    onChange={e => setEditingUrl(e.target.value)}
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    onKeyDown={e => e.key === 'Enter' && saveMeetingUrl()}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveMeetingUrl}
                                        disabled={!editingUrl.trim() || saving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Save size={14} />
                                        {saving ? 'Saving...' : 'Save for Team'}
                                    </button>
                                    {isEditing && (
                                        <button
                                            onClick={() => { setIsEditing(false); setEditingUrl(meetingUrl || ''); }}
                                            className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    This link will be saved so all team members can join the same meeting
                                </p>
                            </div>
                        </>
                    ) : (
                        /* Member view — no meeting link set yet */
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Video size={28} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No Meeting Set Up</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Ask your admin or manager to set up a meeting link.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
