'use client';

import React, { useState, useEffect } from 'react';
import { Link2, Plus, ExternalLink, Trash2, X, Globe, Github, FileText } from 'lucide-react';

interface Shortcut {
    id: string;
    project_id: string;
    name: string;
    url: string;
    type: 'link' | 'repository';
    created_at: string;
}

interface ShortcutsViewProps {
    projectId: string;
}

export default function ShortcutsView({ projectId }: ShortcutsViewProps) {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newShortcut, setNewShortcut] = useState({ name: '', url: '', type: 'link' as 'link' | 'repository' });
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

    const handleAddShortcut = async () => {
        if (!newShortcut.name.trim() || !newShortcut.url.trim()) return;

        let url = newShortcut.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        try {
            const res = await fetch('/api/shortcuts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    name: newShortcut.name,
                    url: url,
                    type: newShortcut.type,
                }),
            });

            if (res.ok) {
                const created = await res.json();
                setShortcuts(prev => [...prev, created]);
            }
        } catch (error) {
            console.error('Error adding shortcut:', error);
        }

        setNewShortcut({ name: '', url: '', type: 'link' });
        setShowAddModal(false);
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

    const getIconForUrl = (url: string, type: string) => {
        if (type === 'repository') {
            if (url.includes('github.com')) return <Github size={20} className="text-gray-800 dark:text-white" />;
            if (url.includes('bitbucket.org')) return <FileText size={20} className="text-blue-600" />;
            if (url.includes('gitlab.com')) return <FileText size={20} className="text-orange-500" />;
            return <FileText size={20} className="text-gray-500" />;
        }
        return <Globe size={20} className="text-blue-500" />;
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
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} />
                    Add shortcut
                </button>
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
                            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                        {getFaviconUrl(shortcut.url) ? (
                                            <img
                                                src={getFaviconUrl(shortcut.url)!}
                                                alt=""
                                                className="w-6 h-6"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}
                                        <span className={getFaviconUrl(shortcut.url) ? 'hidden' : ''}>
                                            {getIconForUrl(shortcut.url, shortcut.type)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                            {shortcut.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {shortcut.url.replace(/^https?:\/\//, '').split('/')[0]}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink size={14} className="text-gray-400" />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteShortcut(shortcut.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors ml-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${shortcut.type === 'repository'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    }`}>
                                    {shortcut.type === 'repository' ? 'Repository' : 'Link'}
                                </span>
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
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setNewShortcut({ ...newShortcut, type: 'link' })}
                                    className={`p-4 rounded-lg border-2 text-left transition-colors ${newShortcut.type === 'link'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                            <Globe size={20} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">Link</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Add a link to a frequently used resource
                                    </p>
                                </button>

                                <button
                                    onClick={() => setNewShortcut({ ...newShortcut, type: 'repository' })}
                                    className={`p-4 rounded-lg border-2 text-left transition-colors ${newShortcut.type === 'repository'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                                            <Github size={20} className="text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">Repository</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Add a GitHub or Bitbucket repository
                                    </p>
                                </button>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newShortcut.name}
                                    onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
                                    placeholder="My Website"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* URL Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    URL
                                </label>
                                <input
                                    type="url"
                                    value={newShortcut.url}
                                    onChange={(e) => setNewShortcut({ ...newShortcut, url: e.target.value })}
                                    placeholder={newShortcut.type === 'repository' ? 'https://github.com/user/repo' : 'https://example.com'}
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
                                onClick={handleAddShortcut}
                                disabled={!newShortcut.name.trim() || !newShortcut.url.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
