'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor, Bell, Shield, Sparkles, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { currentUser, setCurrentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Form state
    const [phone, setPhone] = useState('');
    const [officeAddress, setOfficeAddress] = useState('');
    const [quietHoursStart, setQuietHoursStart] = useState('20:00');
    const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
    const [quietHoursWeekends, setQuietHoursWeekends] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [dob, setDob] = useState('');

    // AI Settings
    const [maxWorkload, setMaxWorkload] = useState(5);
    const [burnoutSensitivity, setBurnoutSensitivity] = useState(2); // 1=Low, 2=Med, 3=High
    const [autoAssign, setAutoAssign] = useState(true);
    const [skillMatchPriority, setSkillMatchPriority] = useState(true);
    const [aiDeadlines, setAiDeadlines] = useState(false);

    // Initialize form with currentUser data
    useEffect(() => {
        if (currentUser) {
            setPhone(currentUser.phone || '');
            setOfficeAddress(currentUser.officeAddress || '');
            setQuietHoursStart(currentUser.quietHoursStart || '20:00');
            setQuietHoursEnd(currentUser.quietHoursEnd || '08:00');
            setQuietHoursWeekends(currentUser.quietHoursWeekends ?? true);
            setTwoFactorEnabled(currentUser.twoFactorEnabled ?? false);
            if (currentUser.maxWorkload) setMaxWorkload(currentUser.maxWorkload);
            if (currentUser.burnoutSensitivity) setBurnoutSensitivity(currentUser.burnoutSensitivity);
            setAutoAssign(currentUser.autoAssign ?? true);
            setSkillMatchPriority(currentUser.skillMatchPriority ?? true);
            setAiDeadlines(currentUser.aiDeadlines ?? false);
            setDob(currentUser.dob || '');
        }
    }, [currentUser]);

    const handleSaveSettings = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const res = await fetch(`/api/users/${currentUser.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    officeAddress,
                    quietHoursStart,
                    quietHoursEnd,
                    quietHoursWeekends,
                    twoFactorEnabled,
                    maxWorkload,
                    burnoutSensitivity,
                    autoAssign,
                    skillMatchPriority,
                    aiDeadlines,
                    dob,
                }),
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setCurrentUser(updatedUser);
                localStorage.setItem('taskflow_current_user', JSON.stringify(updatedUser));
                setSaveMessage('Settings saved successfully!');
            } else {
                setSaveMessage('Failed to save settings.');
            }
        } catch {
            setSaveMessage('Error saving settings.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Building },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'ai', label: 'AI Settings', icon: Sparkles },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="p-4 md:p-8 mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Workspace Settings</h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <nav className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${activeTab === tab.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Workspace Info */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">General Information</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace Name</label>
                                        <input type="text" defaultValue="My Software Team" className="max-w-md w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="max-w-md">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme Preference</label>
                                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg transition-colors">
                                                {[
                                                    { value: 'Light', icon: Sun },
                                                    { value: 'Dark', icon: Moon },
                                                    { value: 'System', icon: Monitor },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setTheme(opt.value as any)}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm rounded-md transition-all ${theme === opt.value
                                                            ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white font-medium'
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                            }`}
                                                    >
                                                        <opt.icon size={14} />
                                                        {opt.value}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Contact Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Email</label>
                                        <input
                                            type="email"
                                            defaultValue={currentUser?.email || ''}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={phone || ''}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Office Address</label>
                                        <textarea
                                            rows={3}
                                            value={officeAddress || ''}
                                            onChange={(e) => setOfficeAddress(e.target.value)}
                                            placeholder="Head Office..."
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notification Settings */}
                    {activeTab === 'notifications' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Notification Preferences</h2>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {['Task assignments', 'Project updates'].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Receive alerts via email and app.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked={true} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quiet Hours (Do Not Disturb)</h3>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                                            <input type="time" value={quietHoursStart || '20:00'} onChange={(e) => setQuietHoursStart(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">End Time</label>
                                            <input type="time" value={quietHoursEnd || '08:00'} onChange={(e) => setQuietHoursEnd(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700" />
                                        </div>
                                        <div className="flex-1 pt-4">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <div className="relative inline-flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={quietHoursWeekends ?? true}
                                                        onChange={(e) => setQuietHoursWeekends(e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </div>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">Enable on Weekends</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Settings */}
                    {activeTab === 'ai' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">AI Configuration</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Daily Workload (Tasks)</label>
                                    <input
                                        type="number"
                                        value={maxWorkload}
                                        onChange={(e) => setMaxWorkload(parseInt(e.target.value))}
                                        className="max-w-xs w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">AI will avoid assigning more than this number of tasks to you per day.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Burnout Sensitivity</label>
                                    <div className="flex gap-4">
                                        {[1, 2, 3].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setBurnoutSensitivity(val)}
                                                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${burnoutSensitivity === val
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                    : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                                                    }`}
                                            >
                                                <span className="font-bold">{val === 1 ? 'Low' : val === 2 ? 'Medium' : 'High'}</span>
                                                <span className="text-[10px] opacity-70 text-center">{val === 1 ? 'Relaxed AI warnings' : val === 2 ? 'Standard balance' : 'Aggressive protection'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Smart Automation</h3>

                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-Assignment</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Allow AI to automatically assign unassigned tasks based on your skills.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={autoAssign}
                                                onChange={(e) => setAutoAssign(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Skill Match Priority</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Prioritize tasks that perfectly match your primary skills.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={skillMatchPriority}
                                                onChange={(e) => setSkillMatchPriority(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">AI-Generated Deadlines</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Let AI suggest realistic deadlines based on task complexity.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={aiDeadlines}
                                                onChange={(e) => setAiDeadlines(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Security Settings */}
                    {activeTab === 'security' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Security & Login</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security to your account.</p>
                                    </div>
                                    <button
                                        onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                        className={`px-3 py-1.5 border rounded text-sm transition-colors ${twoFactorEnabled
                                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                        {twoFactorEnabled ? 'Enabled ✓' : 'Enable'}
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Logged in as</h3>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-4">{currentUser?.name || 'Unknown User'} ({currentUser?.email})</p>
                                </div>

                                {/* Password Change */}
                                {(!currentUser?.authProvider || currentUser.authProvider === 'email') && (
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Change Password</h3>
                                        {/* Hidden username field to trap aggressive browser autofill */}
                                        <input type="text" name="email" autoComplete="username" style={{ display: 'none' }} />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                                                <input type="password" autoComplete="current-password" placeholder="••••••••" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                                                <input type="password" autoComplete="new-password" placeholder="••••••••" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
                                                <input type="password" autoComplete="new-password" placeholder="••••••••" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                            </div>
                                        </div>
                                        <button className="mt-3 px-4 py-2 text-sm bg-gray-800 dark:bg-gray-600 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors">
                                            Update Password
                                        </button>
                                    </div>
                                )}

                                {/* Danger Zone */}
                                <div className="pt-4 border-t border-red-200 dark:border-red-900/50">
                                    <h3 className="text-sm font-medium text-red-600 mb-3">Danger Zone</h3>
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-red-800 dark:text-red-300">Delete Account</p>
                                                <p className="text-xs text-red-600 dark:text-red-400">Permanently delete your account and all data. This action cannot be undone.</p>
                                            </div>
                                            <button className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                                                Delete Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-4 items-center">
                        {saveMessage && (
                            <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                                {saveMessage}
                            </span>
                        )}
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
