'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Priority, Status, Task, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { Sparkles, Search, ChevronDown, Check, User as UserIcon, AlertCircle } from 'lucide-react';

interface CreateTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentProjectId: string;
    onSubmit: (task: Partial<Task>) => void;
}

export function CreateTaskDialog({ isOpen, onClose, currentProjectId, onSubmit }: CreateTaskDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Status>('To Do');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [dependencies, setDependencies] = useState<string[]>([]);
    const [projectTasks, setProjectTasks] = useState<Task[]>([]);

    const { currentUser } = useAuth();
    const isMember = currentUser?.role === 'Member';

    // Users list from API
    const [users, setUsers] = useState<User[]>([]);
    const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiRisk, setAiRisk] = useState<'Low' | 'Medium' | 'High'>('Low');
    const dataRef = React.useRef<any>(null); // Store full response for debug
    const [suggestions, setSuggestions] = useState<{ skills: string[], tags: string[], titles: string[] }>({
        skills: [],
        tags: [],
        titles: []
    });

    // Fetch users and suggestions when dialog opens
    useEffect(() => {
        if (isOpen) {
            setLoadingUsers(true);
            Promise.all([
                fetch('/api/users').then(res => res.json()),
                fetch(`/api/projects/${currentProjectId}/members`).then(res => res.json()),
                fetch('/api/autocomplete').then(res => res.json()),
                fetch(`/api/tasks?projectId=${currentProjectId}`).then(res => res.json())
            ])
                .then(([allUsers, memberIds, autoData, tasksData]) => {
                    setUsers(allUsers);
                    setProjectMemberIds(memberIds);
                    setSuggestions(autoData);
                    setProjectTasks(Array.isArray(tasksData) ? tasksData : []);
                    const projectUsers = allUsers.filter((u: User) => memberIds.includes(u.id));
                    // Set default assignee to first user if available
                    if (isMember && currentUser) {
                        setAssigneeId(currentUser.id);
                    } else if (projectUsers.length > 0 && !assigneeId) {
                        setAssigneeId(projectUsers[0].id);
                    } else if (allUsers.length > 0 && !assigneeId) {
                        setAssigneeId(allUsers[0].id);
                    }
                })
                .catch(console.error)
                .finally(() => setLoadingUsers(false));
        }
    }, [isOpen]);

    const handleAddTag = (e?: React.KeyboardEvent<HTMLInputElement>) => {
        if (e && e.key !== 'Enter') return;
        if (e) e.preventDefault();

        const newTag = tagInput.trim().toLowerCase();
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const [aiUnavailable, setAiUnavailable] = useState(false);

    const handleSmartAssign = async () => {
        if (!title) {
            alert('Please enter a summary first so the AI can analyze requirements.');
            return;
        }

        setIsAnalyzing(true);
        dataRef.current = null;
        setAiUnavailable(false);

        try {
            const res = await fetch('/api/ai/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority, projectId: currentProjectId })
            });
            const data = await res.json();

            if (res.status === 503 || data.status === 'unavailable') {
                setAiUnavailable(true);
                throw new Error(data.error || 'AI Service Unavailable');
            }

            if (data.error) throw new Error(data.error);

            dataRef.current = data;
            
            if (data.allCandidates && data.allCandidates.length > 0) {
                const currentIndex = data.allCandidates.findIndex((c: any) => c.id === assigneeId);
                const nextCandidateIndex = currentIndex >= 0 ? (currentIndex + 1) % data.allCandidates.length : 0;
                
                const selectedCandidate = data.allCandidates[nextCandidateIndex];
                setAssigneeId(selectedCandidate.id);
                setAiRisk(selectedCandidate.risk);
            } else {
                setAssigneeId(data.candidateId);
            }

            if (data.analysis) {
                if (data.analysis.predicted_priority) {
                    setPriority(data.analysis.predicted_priority);

                    const now = new Date();
                    setStartDate(now.toISOString().split('T')[0]);

                    const p = data.analysis.predicted_priority;
                    let days = 7;
                    if (p === 'Critical') days = 1;
                    else if (p === 'High') days = 3;
                    else if (p === 'Medium') days = 7;
                    else if (p === 'Low') days = 14;

                    const end = new Date(now);
                    end.setDate(end.getDate() + days);
                    setDueDate(end.toISOString().split('T')[0]);
                }

                if (data.analysis.detected_skills && Array.isArray(data.analysis.detected_skills)) {
                    const newTags = data.analysis.detected_skills.map((s: string) => s.toLowerCase());
                    // Set tags to ONLY the new tags, clearing any previously selected ones
                    setTags(Array.from(new Set(newTags)));
                }
            }

        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to get AI suggestion');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) return;

        const newTask: Partial<Task> = {
            projectId: currentProjectId,
            title,
            description,
            // ... existing code ...
            status,
            priority,
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
            assigneeId,
            tags: tags,
            isPrivate: isMember ? false : isPrivate,
            dependencies: dependencies
        };

        onSubmit(newTask);
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setStatus('To Do');
        setStartDate('');
        setDueDate('');
        dataRef.current = null;
        setAiUnavailable(false);
        setIsPrivate(false);
        setDependencies([]);
    };

    // Get selected user's skills for display
    const selectedUser = users.find(u => u.id === assigneeId);
    const topCandidate = dataRef.current?.allCandidates?.find((c: any) => c.id === assigneeId) || dataRef.current?.allCandidates?.[0];
    const insightUser = topCandidate
        ? users.find(u => u.id === topCandidate.id) || selectedUser
        : selectedUser;

    const getSkillYears = (user: User | undefined, skill: string): number | null => {
        if (!user?.skillExperience) return null;

        const exact = user.skillExperience[skill];
        if (typeof exact === 'number') return exact;

        const matchedEntry = Object.entries(user.skillExperience).find(
            ([key]) => key.toLowerCase() === skill.toLowerCase()
        );
        return matchedEntry ? matchedEntry[1] : null;
    };

    const skillMatchWithExperience = topCandidate?.matchingSkills?.slice(0, 4).map((skill: string) => {
        const years = getSkillYears(insightUser, skill);
        return years !== null ? `${skill} (${years}y)` : `${skill} (experience n/a)`;
    }) || [];

    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getUserDisplaySkills = (user: User) => {
        const candidate = dataRef.current?.allCandidates?.find((c: any) => c.id === user.id);
        const matching = candidate?.matchingSkills || [];
        const allSkills = user.skills || [];
        
        const limit = 4;
        const remaining = allSkills.length > limit ? allSkills.length - limit : 0;
        
        if (matching.length > 0) {
            return `(Matched: ${matching.slice(0, 2).join(', ')}${matching.length > 2 ? '...' : ''})`;
        }
        return remaining > 0 ? `(${allSkills.slice(0, 2).join(', ')}...)` : '';
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDateToIndian = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Issue">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="What needs to be done?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                {/* AI / Smart Assign Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-blue-900 dark:text-blue-100">Assignee</label>
                        <div className="flex gap-2">
                            {aiUnavailable ? (
                                <span className="text-[10px] text-gray-400 italic">AI Service Unavailable</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSmartAssign}
                                    disabled={isAnalyzing || isMember}
                                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 text-white transition-colors ${isAnalyzing || isMember ? 'bg-blue-300 dark:bg-blue-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90'}`}
                                >
                                    {isAnalyzing ? 'Analyzing...' : <><Sparkles size={12} /> Smart Assign</>}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => !isMember && setIsUserDropdownOpen(!isUserDropdownOpen)}
                            disabled={loadingUsers || isMember}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white flex justify-between items-center hover:border-blue-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="truncate">
                                {loadingUsers ? 'Loading members...' : (selectedUser ? `${selectedUser.name} (${selectedUser.role})` : 'Select Assignee')}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isUserDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden flex flex-col max-h-80">
                                <div className="p-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Search by name or skills (e.g. React, Java)..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="overflow-y-auto flex-1 pt-1 pb-2">
                                    {(() => {
                                        const pMembers = users.filter(u => projectMemberIds.includes(u.id));
                                        const otherMembers = users.filter(u => !projectMemberIds.includes(u.id));
                                        const search = userSearch.toLowerCase();
                                        
                                        const filterFn = (u: User) => 
                                            u.name.toLowerCase().includes(search) || 
                                            u.skills?.some(s => s.toLowerCase().includes(search));

                                        const filteredProject = pMembers.filter(filterFn);
                                        const filteredOther = otherMembers.filter(filterFn);

                                        return (
                                            <>
                                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-700/30">Project Members</div>
                                                {filteredProject.length > 0 ? (
                                                    filteredProject.map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => {
                                                                setAssigneeId(user.id);
                                                                setIsUserDropdownOpen(false);
                                                                setUserSearch('');
                                                            }}
                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between group ${assigneeId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-[10px] font-bold">
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{user.role} {getUserDisplaySkills(user)}</div>
                                                                </div>
                                                            </div>
                                                            {assigneeId === user.id && <Check size={14} className="text-blue-500" />}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center text-xs text-gray-400 italic">No matching project members</div>
                                                )}

                                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-700/30">Other Members</div>
                                                {filteredOther.length > 0 ? (
                                                    filteredOther.map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => {
                                                                setAssigneeId(user.id);
                                                                setIsUserDropdownOpen(false);
                                                                setUserSearch('');
                                                            }}
                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between group ${assigneeId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px] font-bold">
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{user.role} {getUserDisplaySkills(user)}</div>
                                                                </div>
                                                            </div>
                                                            {assigneeId === user.id && <Check size={14} className="text-blue-500" />}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center text-xs text-gray-400 italic">No matching other members</div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Show selected user's skills */}
                    {selectedUser && selectedUser.skills && selectedUser.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2 mt-3">
                            {selectedUser.skills.map((skill, idx) => {
                                const isMatch = topCandidate?.matchingSkills?.some((ms: string) => ms.toLowerCase() === skill.toLowerCase());
                                return (
                                    <span
                                        key={idx}
                                        className={`text-[10px] px-1.5 py-0.5 rounded ${isMatch
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800'
                                            : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'}`}
                                    >
                                        {skill}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {dataRef.current?.allCandidates?.length > 0 && (
                        <div className="space-y-2">
                            <div className={`text-xs p-2 rounded ${aiRisk === 'High' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                <strong>AI Insight:</strong>
                                <ul className="mt-1 space-y-1 list-disc pl-4">
                                    <li>
                                        <span className="font-medium text-gray-900">Skills Match:</span>{' '}
                                        {skillMatchWithExperience.length > 0
                                            ? `${topCandidate?.match_percentage ?? 'n/a'}% (${skillMatchWithExperience.join(', ')})`
                                            : 'No strong skill overlaps detected.'}
                                    </li>
                                    <li>
                                        <span className="font-medium text-gray-900">Wellness Score:</span>{' '}
                                        {topCandidate
                                            ? `${topCandidate.wellness_score}% (${topCandidate.wellness_status})`
                                            : 'n/a'}
                                    </li>
                                    <li>
                                        <span className="font-medium text-gray-900">Overall Assignment Score:</span>{' '}
                                        {topCandidate ? `${topCandidate.score}/100` : 'n/a'}
                                    </li>
                                    {insightUser?.role && (
                                        <li>
                                            <span className="font-medium text-gray-900">Role Fit:</span> {insightUser.role}
                                        </li>
                                    )}
                                </ul>
                                {assigneeId && !projectMemberIds.includes(assigneeId) && (
                                    <div className="mt-1 text-yellow-600 font-semibold">
                                        Note: {users.find(u => u.id === assigneeId)?.name} is not currently in the project. They will be added automatically.
                                    </div>
                                )}
                            </div>
                            <details className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                <summary className="cursor-pointer font-semibold">Debug Scores</summary>
                                <div className="mt-2 space-y-1">
                                    {(dataRef.current?.allCandidates || []).map((c: any) => (
                                        <div key={c.name} className="flex justify-between gap-3">
                                            <span>{c.name}</span>
                                            <span>
                                                Overall: {c.score} ({c.risk}) • Skills: {c.match_percentage}% • Wellness: {c.wellness_score} ({c.wellness_status})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] dark:bg-gray-700 dark:text-white"
                        placeholder="Add details..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" value={status} onChange={e => setStatus(e.target.value as Status)}>
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                        <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                </div>

                {!isMember && (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            id="isPrivate"
                        />
                        <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Private Task (Only visible to assigned member and Managers/Admins)
                        </label>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-500"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <AutocompleteInput
                            options={suggestions.tags}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Add tag and press Enter (e.g., ui, backend)"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                        />
                        <button
                            type="button"
                            onClick={() => handleAddTag()}
                            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {projectTasks.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blocked By (Dependencies)</label>
                        <p className="text-[10px] text-gray-500 mb-2">Select tasks that must be completed before this one can be started.</p>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-800 space-y-1">
                            {projectTasks.map(t => (
                                <label key={t.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        checked={dependencies.includes(t.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setDependencies([...dependencies, t.id]);
                                            } else {
                                                setDependencies(dependencies.filter(id => id !== t.id));
                                            }
                                        }}
                                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="truncate">{t.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <div className="relative w-full bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {startDate ? formatDateToIndian(startDate) : <span className="text-gray-400">dd-mm-yyyy</span>}
                                </span>
                            </div>
                            <input
                                type="date"
                                className="w-full px-3 py-2 text-sm bg-transparent !text-transparent outline-none focus:outline-none focus:ring-0 border-none [&::-webkit-datetime-edit]:!text-transparent [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 dark:[color-scheme:dark]"
                                min="2000-01-01"
                                max="2100-12-31"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                        <div className="relative w-full bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {dueDate ? formatDateToIndian(dueDate) : <span className="text-gray-400">dd-mm-yyyy</span>}
                                </span>
                            </div>
                            <input
                                type="date"
                                className="w-full px-3 py-2 text-sm bg-transparent !text-transparent outline-none focus:outline-none focus:ring-0 border-none [&::-webkit-datetime-edit]:!text-transparent [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 dark:[color-scheme:dark]"
                                min="2000-01-01"
                                max="2100-12-31"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Create</button>
                </div>
            </form>
        </Modal>
    );
}
