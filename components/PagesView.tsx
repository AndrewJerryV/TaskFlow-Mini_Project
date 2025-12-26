'use client';

import React, { useState } from 'react';
import { FileText, BarChart3, Plus, X, Edit3, Calendar, User, ArrowLeft, Save, Trash2, Download } from 'lucide-react';

interface Page {
    id: string;
    title: string;
    icon: 'document' | 'chart';
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
        title: 'Project Requirements',
        icon: 'document',
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
        title: 'Q1 Marketing Strategy',
        icon: 'chart',
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
    const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
    const [selectedPage, setSelectedPage] = useState<Page | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');

    const handlePageClick = (page: Page) => {
        setSelectedPage(page);
        setEditContent(page.content);
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

    const handleSave = () => {
        if (selectedPage) {
            const updatedPages = pages.map(p =>
                p.id === selectedPage.id
                    ? { ...p, title: editTitle, content: editContent, updatedAt: 'Just now', updatedBy: 'You' }
                    : p
            );
            setPages(updatedPages);
            setSelectedPage({ ...selectedPage, title: editTitle, content: editContent, updatedAt: 'Just now', updatedBy: 'You' });
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (selectedPage && confirm('Are you sure you want to delete this page?')) {
            setPages(pages.filter(p => p.id !== selectedPage.id));
            setSelectedPage(null);
        }
    };

    const handleCreatePage = () => {
        if (newPageTitle.trim()) {
            const newPage: Page = {
                id: `page-${Date.now()}`,
                title: newPageTitle.trim(),
                icon: 'document',
                content: `# ${newPageTitle.trim()}\n\nStart writing your content here...`,
                updatedAt: 'Just now',
                updatedBy: 'You'
            };
            setPages([...pages, newPage]);
            setNewPageTitle('');
            setIsCreating(false);
            handlePageClick(newPage);
        }
    };

    // Render markdown-like content (basic)
    const renderContent = (content: string) => {
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
                                    onClick={() => {
                                        const blob = new Blob([selectedPage.content], { type: 'text/markdown' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${selectedPage.title.replace(/[^a-z0-9]/gi, '_')}.md`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                    <Download size={16} /> Download
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
                        <Calendar size={12} /> Updated {selectedPage.updatedAt}
                    </span>
                    <span className="flex items-center gap-1">
                        <User size={12} /> by {selectedPage.updatedBy}
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

    // Pages grid view
    return (
        <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map((page) => (
                    <div
                        key={page.id}
                        onClick={() => handlePageClick(page)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer group transition-all"
                    >
                        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md mb-3 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            {page.icon === 'document' ? (
                                <FileText size={48} className="text-gray-400 dark:text-gray-500" />
                            ) : (
                                <BarChart3 size={48} className="text-gray-400 dark:text-gray-500" />
                            )}
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">{page.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Updated {page.updatedAt} by {page.updatedBy}</p>
                    </div>
                ))}

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
                    <div
                        onClick={() => setIsCreating(true)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer transition-colors min-h-[180px]"
                    >
                        <Plus size={32} className="mb-1" />
                        <span>Create Page</span>
                    </div>
                )}
            </div>
        </div>
    );
}
