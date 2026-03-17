'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Github, Trash2, Clock, FolderGit2, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

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

function RepoCard({ repo, currentUser, onDelete, onOpenInNewTab, onCopyLink, copiedId }: { repo: RepoLink, currentUser: User | null, onDelete: (id: string) => void, onOpenInNewTab: (url: string) => void, onCopyLink: (id: string, url: string) => void, copiedId: string | null }) {
    const [githubData, setGithubData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRepoDetails() {
            try {
                const res = await fetch(`/api/github?owner=${repo.owner}&repo=${repo.repo}`);
                if (res.ok) {
                    const data = await res.json();
                    setGithubData(data);
                }
            } catch (e) {
                console.error("Failed to fetch GitHub data for repo", repo.repo);
            } finally {
                setLoading(false);
            }
        }
        fetchRepoDetails();
    }, [repo]);

    const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const userName = currentUser?.name?.toLowerCase() || '';

    // Filter issues based on role
    let visibleIssues: any[] = [];
    if (githubData?.issues?.list) {
        if (isAdminOrManager) {
            // API already returns issues ordered by CREATED_AT DESC.
            visibleIssues = githubData.issues.list.slice(0, 3);
        } else {
            // Find issues assigned to the user loosely by name
            visibleIssues = githubData.issues.list.filter((i: any) => 
                i.assignees?.nodes?.some((a: any) => a.login.toLowerCase().includes(userName) || userName.includes(a.login.toLowerCase()))
            );
        }
    }

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all group flex flex-col h-full"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <Github size={22} className="text-white dark:text-gray-900" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {repo.repo}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {repo.owner}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(repo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    title="Remove"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Added {formatDate(repo.added_at)}
                </span>
            </div>

            {/* GitHub Live Data Section */}
            <div className="flex-grow">
                {loading ? (
                    <div className="animate-pulse space-y-2 mb-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                ) : githubData ? (
                    <div className="space-y-4 mb-4">
                        {/* Issues */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                    {isAdminOrManager ? 'Latest Open Issues' : 'Your Assigned Issues'}
                                </h4>
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                    {visibleIssues.length}
                                </span>
                            </div>
                            {visibleIssues.length > 0 ? (
                                <ul className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pr-1">
                                    {visibleIssues.map((is: any) => (
                                        <li key={is.number} className="text-sm">
                                            <a href={is.url} target="_blank" rel="noreferrer" className="flex gap-2 group/issue">
                                                <span className="text-green-500 flex-shrink-0 mt-0.5">⊙</span>
                                                <span className="text-gray-700 dark:text-gray-300 group-hover/issue:text-blue-600 dark:group-hover/issue:text-blue-400 line-clamp-1 transition-colors">
                                                    {is.title}
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">None</p>
                            )}
                        </div>

                        {/* PRs (Only for Admin/Manager as requested "admin/manager can see all the issues as well PRs") */}
                        {isAdminOrManager && (
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Open PRs</h4>
                                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                        {githubData.pullRequests?.total || 0}
                                    </span>
                                </div>
                                {githubData.pullRequests?.list?.length > 0 ? (
                                    <ul className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pr-1">
                                        {githubData.pullRequests.list.slice(0, 5).map((pr: any) => (
                                            <li key={pr.number} className="text-sm">
                                                <a href={pr.url} target="_blank" rel="noreferrer" className="flex gap-2 group/pr">
                                                    <FolderGit2 size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
                                                    <span className="text-gray-700 dark:text-gray-300 group-hover/pr:text-blue-600 dark:group-hover/pr:text-blue-400 line-clamp-1 transition-colors">
                                                        {pr.title}
                                                    </span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No open pull requests</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-red-500 mb-4">Failed to load repository data.</div>
                )}
            </div>

            <div className="mt-auto">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onOpenInNewTab(repo.url)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <ExternalLink size={14} />
                        GitHub
                    </button>
                    <button
                        onClick={() => onCopyLink(repo.id, repo.url)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Copy URL"
                    >
                        {copiedId === repo.id ? (
                            <Check size={14} className="text-green-500" />
                        ) : (
                            <Copy size={14} />
                        )}
                    </button>
                </div>

                {/* Quick Links */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => onOpenInNewTab(`${repo.url}/issues`)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        Issues
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <button
                        onClick={() => onOpenInNewTab(`${repo.url}/pulls`)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        Pull Requests
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <button
                        onClick={() => onOpenInNewTab(`${repo.url}/actions`)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        Actions
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CodeView({ projectId }: CodeViewProps) {
    const [repos, setRepos] = useState<RepoLink[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [urlError, setUrlError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    
    const { currentUser } = useAuth();

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {repos.map(repo => (
                        <RepoCard 
                            key={repo.id} 
                            repo={repo} 
                            currentUser={currentUser} 
                            onDelete={handleDeleteRepo} 
                            onOpenInNewTab={openInNewTab} 
                            onCopyLink={copyLink} 
                            copiedId={copiedId}
                        />
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
