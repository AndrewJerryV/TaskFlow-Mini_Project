'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Github, Trash2, Clock, FolderGit2, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';

interface CodeViewProps {
    projectId: string;
}

interface RepoLink {
    id: string;
    project_id: string;
    name: string;
    url: string;
    owner: string;
    repo: string;
    description?: string;
    added_at: string;
}

// Validate GitHub URL
function isValidGitHubUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com';
    } catch {
        return false;
    }
}

// Parse GitHub URL
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
        return null;
    } catch {
        return null;
    }
}

export default function CodeView({ projectId }: CodeViewProps) {
    const [repos, setRepos] = useState<RepoLink[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [urlError, setUrlError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load repos from the database via API
    useEffect(() => {
        async function fetchRepos() {
            try {
                setLoading(true);
                const res = await fetch(`/api/repos?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRepos(data);
                }
            } catch (error) {
                console.error('Error fetching repos:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchRepos();
    }, [projectId]);

    const handleAddRepo = async () => {
        if (!newUrl.trim()) {
            setUrlError('Please enter a URL');
            return;
        }

        // Add https if missing
        let url = newUrl.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        if (!isValidGitHubUrl(url)) {
            setUrlError('Only GitHub URLs are allowed (github.com)');
            return;
        }

        const parsed = parseGitHubUrl(url);
        if (!parsed) {
            setUrlError('Invalid GitHub repository URL');
            return;
        }

        try {
            const res = await fetch('/api/repos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    name: `${parsed.owner}/${parsed.repo}`,
                    url: url,
                    owner: parsed.owner,
                    repo: parsed.repo,
                    description: newDescription.trim() || undefined,
                }),
            });

            if (res.ok) {
                const created = await res.json();
                setRepos(prev => [...prev, created]);
            }
        } catch (error) {
            console.error('Error adding repo:', error);
        }

        setNewUrl('');
        setNewDescription('');
        setUrlError('');
        setIsAddOpen(false);
    };

    const handleDeleteRepo = async (repoId: string) => {
        if (!confirm('Remove this repository?')) return;
        try {
            const res = await fetch(`/api/repos?id=${repoId}`, { method: 'DELETE' });
            if (res.ok) {
                setRepos(prev => prev.filter(r => r.id !== repoId));
            }
        } catch (error) {
            console.error('Error deleting repo:', error);
        }
    };

    const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

    const copyLink = async (repoId: string, url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(repoId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            prompt('Copy this link:', url);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Github size={22} className="text-gray-700 dark:text-gray-300" />
                        Repositories
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Quick access to your GitHub repositories
                    </p>
                </div>
            </div>

            {/* Repos Grid */}
            {repos.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FolderGit2 size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No repositories linked
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Add GitHub repository links for quick access. Your team can easily jump to any repo from here.
                    </p>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        <Github size={18} />
                        Add Your First Repository
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {repos.map(repo => (
                        <div
                            key={repo.id}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
                                        <Github size={22} className="text-white dark:text-gray-900" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {repo.repo}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {repo.owner}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteRepo(repo.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                    title="Remove"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {repo.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                    {repo.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-4">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    Added {formatDate(repo.added_at)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openInNewTab(repo.url)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    Open in GitHub
                                </button>
                                <button
                                    onClick={() => copyLink(repo.id, repo.url)}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    title="Copy URL"
                                >
                                    {copiedId === repo.id ? (
                                        <>
                                            <Check size={14} className="text-green-500" />
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Quick Links */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => openInNewTab(`${repo.url}/issues`)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Issues
                                </button>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <button
                                    onClick={() => openInNewTab(`${repo.url}/pulls`)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Pull Requests
                                </button>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <button
                                    onClick={() => openInNewTab(`${repo.url}/actions`)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Actions
                                </button>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <button
                                    onClick={() => openInNewTab(`${repo.url}/settings`)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Settings
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Card */}
                    <div
                        onClick={() => setIsAddOpen(true)}
                        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
                    >
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors">
                            <Plus size={24} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Add another repository
                        </span>
                    </div>
                </div>
            )}

            {/* Add Repository Modal */}
            <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setNewUrl(''); setNewDescription(''); setUrlError(''); }} title="Add GitHub Repository">
                <div className="p-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Repository URL <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="url"
                                    value={newUrl}
                                    onChange={e => { setNewUrl(e.target.value); setUrlError(''); }}
                                    placeholder="https://github.com/owner/repository"
                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    onKeyDown={e => e.key === 'Enter' && handleAddRepo()}
                                />
                            </div>
                            {urlError && (
                                <p className="text-red-500 text-sm mt-2">{urlError}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description <span className="text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                                placeholder="What is this repository for?"
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => { setIsAddOpen(false); setNewUrl(''); setNewDescription(''); setUrlError(''); }}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddRepo}
                            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                        >
                            Add Repository
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
