'use client';

import React, { useState, useEffect } from 'react';
import { FileText, BarChart3, Plus, X, Edit3, Calendar, User, ArrowLeft, Save, Trash2, Download, Presentation, FileSpreadsheet, MoreVertical, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveClientSupabaseConfig } from '@/lib/browser-supabase-config';
import { db } from '@/lib/db';

interface Page {
    id: string;
    title: string;
    icon: 'document' | 'chart' | 'word' | 'ppt' | 'excel';
    content: string;
    updatedAt: string;
    updatedBy: string;
}

interface PagesViewProps {
    projectId: string;
}



const INITIAL_PAGES: Page[] = [
    {
        id: 'page-1',
        title: 'Project Requirements.docx',
        icon: 'word',
        content: `# Project Requirements

## Overview
This document outlines the core requirements for the TaskFlow project management application.

## Functional Requirements

### User Authentication
- Users must be able to register with email and password
- Users must be able to login/logout securely
- Password reset functionality via email

### Project Management
- Create, edit, and delete projects
- Invite team members to projects
- Set project visibility (public/private)

### Task Management
- Create tasks with title, description, priority, and due date
- Assign tasks to team members
- Move tasks between status columns (To Do, In Progress, Review, Done)
- Add comments to tasks
- Attach files to tasks

### Collaboration
- Real-time chat within projects
- Activity feed showing recent changes
- @mentions in comments and chat

## Non-Functional Requirements

### Performance
- Page load time < 2 seconds
- Support for 100+ concurrent users

### Security
- All data encrypted in transit (HTTPS)
- Session-based authentication
- Role-based access control

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible`,
        updatedAt: 'Yesterday',
        updatedBy: 'Andrew'
    },
    {
        id: 'page-2',
        title: 'Q1 Marketing Strategy.pptx',
        icon: 'ppt',
        content: `# Q1 Marketing Strategy

## Goals
1. Increase user signups by 50%
2. Improve brand awareness in target markets
3. Launch referral program

## Target Audience
- Small to medium business teams (5-50 people)
- Startup founders and project managers
- Remote and hybrid teams

## Channels

### Content Marketing
- Weekly blog posts on productivity and project management
- Video tutorials on YouTube
- Guest posts on industry blogs

### Social Media
- Daily posts on Twitter/X and LinkedIn
- Community engagement in relevant subreddits
- Influencer partnerships

### Paid Advertising
- Google Ads for high-intent keywords
- LinkedIn sponsored content
- Retargeting campaigns

## Timeline

| Month | Focus Area | KPIs |
|-------|------------|------|
| January | Content foundation | 10 blog posts, 5 videos |
| February | Social media push | 1000 new followers |
| March | Paid campaigns | 500 new signups |

## Budget Allocation
- Content: 30%
- Social Media: 25%
- Paid Ads: 35%
- Tools & Analytics: 10%`,
        updatedAt: '2 days ago',
        updatedBy: 'Sarah'
    }
];


export default function PagesView({ projectId }: PagesViewProps) {
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState<any | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { currentUser } = useAuth();

    // Fetch documents
    useEffect(() => {
        fetchDocuments();
    }, [projectId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/documents?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setPages(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageClick = (page: any) => {
        if (page.type === 'file') {
            // Setup download/view link
            const supabaseUrl = resolveClientSupabaseConfig()?.url;
            if (!supabaseUrl) {
                alert('Supabase storage is not configured on this device yet.');
                return;
            }
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/project-files/${page.filePath}`;
            window.open(publicUrl, '_blank');
            return;
        }
        setSelectedPage(page);
        setEditContent(page.content || '');
        setEditTitle(page.title);
        setIsEditing(false);
    };

    const handleBack = () => {
        setSelectedPage(null);
        setIsEditing(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (selectedPage) {
            // Optimistic Update
            const updatedPages = pages.map(p =>
                p.id === selectedPage.id
                    ? { ...p, title: editTitle, content: editContent, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name || 'You' }
                    : p
            );
            setPages(updatedPages);
            setSelectedPage({ ...selectedPage, title: editTitle, content: editContent, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name || 'You' });
            setIsEditing(false);

            // Persist to database
            try {
                const success = await db.updateDocument(selectedPage.id, { title: editTitle, content: editContent });
                if (!success) {
                    console.error('Failed to save page');
                }
            } catch (error) {
                console.error('Save error:', error);
            }
        }
    };

    const handleDelete = async () => {
        if (selectedPage && confirm('Are you sure you want to delete this page?')) {
            await deleteDocument(selectedPage.id);
            setPages(pages.filter(p => p.id !== selectedPage.id));
            setSelectedPage(null);
        }
    };

    const deleteDocument = async (docId: string) => {
        try {
            await db.deleteDocument(docId);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleDeleteFromList = async (e: React.MouseEvent, pageId: string) => {
        e.stopPropagation();
        setMenuOpenId(null);
        if (confirm('Are you sure you want to delete this document?')) {
            await deleteDocument(pageId);
            setPages(pages.filter(p => p.id !== pageId));
        }
    };

    const handleStartRename = (e: React.MouseEvent, page: any) => {
        e.stopPropagation();
        setMenuOpenId(null);
        setRenamingPageId(page.id);
        setRenameValue(page.title);
    };

    const handleRenameSubmit = async (e: React.FormEvent, pageId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (renameValue.trim()) {
            // Optimistic update
            setPages(pages.map(p => p.id === pageId ? { ...p, title: renameValue.trim() } : p));
            setRenamingPageId(null);
            // API call to rename
            try {
                await db.updateDocument(pageId, { title: renameValue.trim() });
            } catch (error) {
                console.error('Rename error:', error);
            }
        }
    };

    const handleCreatePage = async () => {
        if (newPageTitle.trim()) {
            try {
                const newDoc = await db.createDocument({
                    id: crypto.randomUUID(),
                    projectId,
                    title: newPageTitle.trim(),
                    type: 'page',
                    content: `# ${newPageTitle.trim()}\n\nStart writing your content here...`,
                    filePath: undefined,
                    fileType: undefined,
                    size: undefined,
                    createdBy: currentUser?.id || '00000000-0000-0000-0000-000000000001',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                if (newDoc) {
                    setPages([newDoc, ...pages]);
                    setNewPageTitle('');
                    setIsCreating(false);
                    // handlePageClick(newDoc); // Don't auto open to keep flow simple
                }
            } catch (err) {
                alert('Failed to create page');
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('type', 'file');
        formData.append('projectId', projectId);
        formData.append('userId', currentUser?.id || '00000000-0000-0000-0000-000000000001');
        formData.append('file', file);

        try {
            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const newDoc = await res.json();
                setPages([newDoc, ...pages]);
            } else {
                const err = await res.json();
                alert(err.error || 'Upload failed');
            }
        } catch (error) {
            console.error(error);
            alert('Upload error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Render markdown-like content (basic)
    const renderContent = (content: string) => {
        if (!content) return null;
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let tableRows: { key: number; cells: string[] }[] = [];
        let inTable = false;

        const flushTable = () => {
            if (tableRows.length > 0) {
                elements.push(
                    <table key={`table-${tableRows[0].key}`} className="w-full border-collapse my-4">
                        <tbody>
                            {tableRows.map((row) => (
                                <tr key={row.key} className="border-b border-gray-200 dark:border-gray-700">
                                    {row.cells.map((cell, j) => (
                                        <td key={j} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
                tableRows = [];
            }
            inTable = false;
        };

        lines.forEach((line, i) => {
            // Headers
            if (line.startsWith('# ')) {
                flushTable();
                elements.push(<h1 key={i} className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{line.slice(2)}</h1>);
                return;
            }
            if (line.startsWith('## ')) {
                flushTable();
                elements.push(<h2 key={i} className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-3">{line.slice(3)}</h2>);
                return;
            }
            if (line.startsWith('### ')) {
                flushTable();
                elements.push(<h3 key={i} className="text-lg font-medium text-gray-700 dark:text-gray-200 mt-4 mb-2">{line.slice(4)}</h3>);
                return;
            }
            // List items
            if (line.startsWith('- ')) {
                flushTable();
                elements.push(<li key={i} className="ml-4 text-gray-600 dark:text-gray-300 mb-1">{line.slice(2)}</li>);
                return;
            }
            if (line.match(/^\d+\. /)) {
                flushTable();
                elements.push(<li key={i} className="ml-4 text-gray-600 dark:text-gray-300 mb-1 list-decimal">{line.replace(/^\d+\. /, '')}</li>);
                return;
            }
            // Table rows
            if (line.startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim());
                // Skip separator rows (|---|---|)
                if (cells.every(c => c.trim().match(/^-+$/))) {
                    return;
                }
                inTable = true;
                tableRows.push({ key: i, cells: cells.map(c => c.trim()) });
                return;
            }
            // Not a table line - flush any pending table
            if (inTable) {
                flushTable();
            }
            // Empty lines
            if (line.trim() === '') {
                elements.push(<div key={i} className="h-2" />);
                return;
            }
            // Regular paragraphs
            elements.push(<p key={i} className="text-gray-600 dark:text-gray-300 mb-2">{line}</p>);
        });

        // Flush any remaining table at end
        flushTable();

        return elements;
    };

    // Document viewer
    if (selectedPage) {
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                            />
                        ) : (
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedPage.title}</h1>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Save size={16} /> Save
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <Edit3 size={16} /> Edit
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Meta info */}
                <div className="px-6 py-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <span className="flex items-center gap-1">
                        <Calendar size={12} /> Updated {new Date(selectedPage.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <User size={12} /> by {selectedPage.createdBy || 'Unknown'}
                    </span>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[500px]">
                    {isEditing ? (
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-[400px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                            placeholder="Write your content using markdown..."
                        />
                    ) : (
                        <div className="prose dark:prose-invert max-w-none">
                            {renderContent(selectedPage.content)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-6">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
            />
            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading documents...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {pages.filter(page => page != null).map((page) => {
                        // Determine icon
                        let IconComponent = FileText;
                        let iconColor = "text-gray-400 dark:text-gray-500";

                        if (page.type === 'file') {
                            const ext = page.title.split('.').pop()?.toLowerCase();
                            if (['doc', 'docx'].includes(ext || '')) {
                                IconComponent = FileText; // Or bespoke Word icon if available
                                iconColor = "text-blue-600 dark:text-blue-400";
                            } else if (['ppt', 'pptx'].includes(ext || '')) {
                                IconComponent = Presentation;
                                iconColor = "text-orange-500 dark:text-orange-400";
                            } else if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
                                IconComponent = FileSpreadsheet;
                                iconColor = "text-green-600 dark:text-green-400";
                            }
                        } else if (page.icon === 'chart') {
                            // Legacy support or specific page type
                            IconComponent = BarChart3;
                            iconColor = "text-purple-500 dark:text-purple-400";
                        } else if (typeof page.icon === 'string' && page.icon === 'word') {
                            IconComponent = FileText;
                            iconColor = "text-blue-600 dark:text-blue-400";
                        } else if (typeof page.icon === 'string' && page.icon === 'ppt') {
                            IconComponent = Presentation;
                            iconColor = "text-orange-500 dark:text-orange-400";
                        }

                        return (
                            <div
                                key={page.id}
                                onClick={() => !renamingPageId && handlePageClick(page)}
                                className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer group transition-all relative"
                            >
                                {/* Action Menu Button - Bottom Right */}
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id); }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                    >
                                        <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                                    </button>
                                    {/* Dropdown Menu - Opens upward */}
                                    {menuOpenId === page.id && (
                                        <div className="absolute right-0 bottom-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[120px] z-20">
                                            <button
                                                onClick={(e) => handleStartRename(e, page)}
                                                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                            >
                                                <Pencil size={14} /> Rename
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteFromList(e, page.id)}
                                                className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-md mb-2 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <IconComponent size={36} className={iconColor} />
                                </div>

                                {renamingPageId === page.id ? (
                                    <form onSubmit={(e) => handleRenameSubmit(e, page.id)} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={() => setRenamingPageId(null)}
                                            autoFocus
                                            className="w-full px-2 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none"
                                        />
                                    </form>
                                ) : (
                                    <h3 className="font-medium text-sm text-gray-800 dark:text-white truncate" title={page.title}>{page.title}</h3>
                                )}
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {new Date(page.updatedAt || new Date()).toLocaleDateString()}
                                </p>
                            </div>
                        );
                    })}

                    {/* Create new page */}
                    {isCreating ? (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-400 dark:border-blue-500">
                            <input
                                type="text"
                                value={newPageTitle}
                                onChange={(e) => setNewPageTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                                placeholder="Page title..."
                                autoFocus
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreatePage}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => { setIsCreating(false); setNewPageTitle(''); }}
                                    className="px-3 py-2 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Create Page Button */}
                            <div
                                onClick={() => setIsCreating(true)}
                                className="bg-white dark:bg-gray-800 p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex flex-col items-center text-gray-400 dark:text-gray-500 cursor-pointer transition-colors"
                            >
                                <div className="h-24 flex items-center justify-center">
                                    <Plus size={36} />
                                </div>
                                <h3 className="font-medium text-sm">Create Page</h3>
                                <p className="text-[10px]">&nbsp;</p>
                            </div>

                            {/* Upload File Button */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white dark:bg-gray-800 p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex flex-col items-center text-gray-400 dark:text-gray-500 cursor-pointer transition-colors"
                            >
                                <div className="h-24 flex items-center justify-center">
                                    {uploading ? (
                                        <span>Uploading...</span>
                                    ) : (
                                        <Download size={36} className="rotate-180" />
                                    )}
                                </div>
                                <h3 className="font-medium text-sm">Upload File</h3>
                                <p className="text-[10px]">&nbsp;</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
