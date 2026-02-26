'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import {
    Plus, FileText, Trash2, ExternalLink, Link2,
    ClipboardCopy, Check, Calendar, Lightbulb
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface FormsViewProps {
    projectId: string;
}

interface FormLink {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    form_url: string;
    created_by?: string;
    created_at: string;
}

export default function FormsView({ projectId }: FormsViewProps) {
    const { currentUser } = useAuth();
    const [forms, setForms] = useState<FormLink[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Add form state
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formUrl, setFormUrl] = useState('');

    // Load forms from the database via API
    useEffect(() => {
        async function fetchForms() {
            try {
                setLoading(true);
                const res = await fetch(`/api/form-links?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setForms(data);
                }
            } catch (error) {
                console.error('Error fetching form links:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchForms();
    }, [projectId]);

    const handleAddForm = async () => {
        if (!formTitle.trim() || !formUrl.trim() || !currentUser) return;

        try {
            const res = await fetch('/api/form-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    title: formTitle,
                    description: formDescription,
                    form_url: formUrl.trim(),
                    created_by: currentUser.id,
                }),
            });

            if (res.ok) {
                const created = await res.json();
                setForms(prev => [created, ...prev]);
            }
        } catch (error) {
            console.error('Error adding form link:', error);
        }

        resetForm();
        setIsAddOpen(false);
    };

    const handleDeleteForm = async (formId: string) => {
        if (!confirm('Are you sure you want to remove this form?')) return;
        try {
            const res = await fetch(`/api/form-links?id=${formId}`, { method: 'DELETE' });
            if (res.ok) {
                setForms(prev => prev.filter(f => f.id !== formId));
            }
        } catch (error) {
            console.error('Error deleting form link:', error);
        }
    };

    const resetForm = () => {
        setFormTitle('');
        setFormDescription('');
        setFormUrl('');
    };

    const openInNewTab = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const copyLink = async (formId: string, url: string) => {
        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback: create a temporary textarea
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopiedId(formId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Show the URL in a prompt as last resort
            prompt('Copy this link:', url);
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-6 flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className={`max-w-5xl mx-auto p-6 ${forms.length === 0 ? 'overflow-hidden' : ''}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={22} className="text-blue-500" />
                        Forms
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add Google Forms or survey links for your team
                    </p>
                </div>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={18} />
                    Add Form
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <Lightbulb size={18} className="text-blue-500" />
                    Quick Start
                </h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Create a form at <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 dark:hover:text-blue-100 font-medium">forms.google.com</a></li>
                    <li>Click &quot;Send&quot; → Link icon → Copy the link</li>
                    <li>Click &quot;Add Form&quot; above and paste the link</li>
                </ol>
            </div>

            {/* Forms List */}
            {forms.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-1">
                        <FileText size={32} className="text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No forms added yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                        Add Google Forms, Typeform, or any survey links for your team to access
                    </p>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Add Your First Form
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {forms.map(form => (
                        <div
                            key={form.id}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Link2 size={24} className="text-blue-600 dark:text-blue-400" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{form.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {form.description || form.form_url}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        <Calendar size={12} />
                                        Added {formatDate(form.created_at)}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => copyLink(form.id, form.form_url)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        title="Copy link"
                                    >
                                        {copiedId === form.id ? (
                                            <>
                                                <Check size={14} className="text-green-500" />
                                                <span className="text-green-600 dark:text-green-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardCopy size={14} />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => openInNewTab(form.form_url)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        Open Form
                                    </button>
                                    <button
                                        onClick={() => handleDeleteForm(form.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Form Modal */}
            <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Add Form Link">
                <div className="p-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Form Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="e.g., Sprint Feedback Survey"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                placeholder="What is this form for?"
                                rows={2}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Form URL <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="url"
                                value={formUrl}
                                onChange={e => setFormUrl(e.target.value)}
                                placeholder="https://docs.google.com/forms/d/e/..."
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Works with Google Forms, Typeform, Microsoft Forms, and more
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => { setIsAddOpen(false); resetForm(); }}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddForm}
                            disabled={!formTitle.trim() || !formUrl.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Add Form
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
