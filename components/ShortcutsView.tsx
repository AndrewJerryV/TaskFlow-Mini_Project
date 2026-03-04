'use client';

import React, { useState, useEffect } from 'react';
import { Link2, Plus, Trash2, X, Globe, Pencil } from 'lucide-react';

interface Shortcut {
    id: string;
    project_id: string;
    name: string;
    url: string;
    created_at: string;
}

interface ShortcutsViewProps {
    projectId: string;
}

export default function ShortcutsView({ projectId }: ShortcutsViewProps) {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editId, setEditId] = useState<string|null>(null);
    const [newShortcut, setNewShortcut] = useState({ name: '', url: '' });
    const [loading, setLoading] = useState(true);

    // Load shortcuts from the database via API
    useEffect(() => {
        async function fetchShortcuts() {
            try {
                setLoading(true);
                const res = await fetch(`/api/shortcuts?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setShortcuts(data);
                }
            } catch (error) {
                console.error('Error fetching shortcuts:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchShortcuts();
    }, [projectId]);

    const handleAddOrEditShortcut = async () => {
        if (!newShortcut.name.trim() || !newShortcut.url.trim()) return;
        let url = newShortcut.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        if (editId) {
            try {
                const res = await fetch('/api/shortcuts', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editId, name: newShortcut.name, url }),
                });
                if (res.ok) {
                    const updated = await res.json();
                    setShortcuts(prev => prev.map(s => s.id === editId ? updated : s));
                }
            } catch (error) { console.error('Error editing shortcut:', error); }
        } else {
            try {
                const res = await fetch('/api/shortcuts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_id: projectId, name: newShortcut.name, url }),
                });
                if (res.ok) {
                    const created = await res.json();
                    setShortcuts(prev => [...prev, created]);
                }
            } catch (error) { console.error('Error adding shortcut:', error); }
        }
        setNewShortcut({ name: '', url: '' });
        setShowAddModal(false);
        setEditId(null);
    };

    const handleDeleteShortcut = async (id: string) => {
        try {
            const res = await fetch(`/api/shortcuts?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setShortcuts(prev => prev.filter(s => s.id !== id));
            }
        } catch (error) {
            console.error('Error deleting shortcut:', error);
        }
    };



    const getFaviconUrl = (url: string) => {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return null;
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shortcuts</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Quick access to your frequently used resources
                    </p>
                </div>
            </div>

            {/* Shortcuts Grid or Empty State */}
            {shortcuts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="max-w-sm mx-auto">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Link2 size={32} className="text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Access your shortcuts in one place
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Add your favorite websites and apps to view them alongside your work.
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Add shortcut
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shortcuts.map(shortcut => (
                        <a
                            key={shortcut.id}
                            href={shortcut.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all min-h-[80px] flex items-center overflow-hidden"
                        >
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditId(shortcut.id);
                                        setNewShortcut({ name: shortcut.name, url: shortcut.url });
                                        setShowAddModal(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                    title="Edit"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteShortcut(shortcut.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 w-full">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                    {getFaviconUrl(shortcut.url) ? (
                                        <img
                                            src={getFaviconUrl(shortcut.url)!}
                                            alt=""
                                            className="w-9 h-9"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <span className={getFaviconUrl(shortcut.url) ? 'hidden' : ''}>
                                        <Globe size={24} className="text-blue-500" />
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-lg text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {shortcut.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {shortcut.url.replace(/^https?:\/\//, '').split('/')[0]}
                                    </p>
                                </div>
                            </div>
                        </a>
                    ))}

                    {/* Add New Card */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[120px]"
                    >
                        <Plus size={24} className="mb-2" />
                        <span className="text-sm font-medium">Add shortcut</span>
                    </button>
                </div>
            )}

            {/* Add Shortcut Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add shortcut</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newShortcut.name}
                                    onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
                                    placeholder="My Website"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                                <input
                                    type="url"
                                    value={newShortcut.url}
                                    onChange={(e) => setNewShortcut({ ...newShortcut, url: e.target.value })}
                                    placeholder="https://example.com"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrEditShortcut}
                                disabled={!newShortcut.name.trim() || !newShortcut.url.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editId ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
