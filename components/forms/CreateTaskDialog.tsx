'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Priority, Status, Task, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { Sparkles } from 'lucide-react';
import { CustomSelect, SelectOption } from '@/components/ui/CustomSelect';
import { analyzeTaskDraftInBrowser } from '@/lib/ml-browser';

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
    const [browserInsight, setBrowserInsight] = useState<ReturnType<typeof analyzeTaskDraftInBrowser>>(null);
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

    useEffect(() => {
        if (!isOpen) return;
        setBrowserInsight(analyzeTaskDraftInBrowser({ title, description, users }));
    }, [isOpen, title, description, users]);

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

    const formatDateToIndian = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    const statusOptions: SelectOption[] = [
        { value: 'To Do', label: 'To Do' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Done', label: 'Done' },
    ];

    const priorityOptions: SelectOption[] = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    const assigneeOptions: SelectOption[] = [
        ...users.filter(u => projectMemberIds.includes(u.id)).map(u => ({
            value: u.id,
            label: u.name,
            group: 'Project Members',
            avatar: u.name.charAt(0).toUpperCase(),
            avatarUrl: u.avatarUrl,
            metadata: `${u.role} ${getUserDisplaySkills(u)}`
        })),
        ...users.filter(u => !projectMemberIds.includes(u.id)).map(u => ({
            value: u.id,
            label: u.name,
            group: 'Other Members',
            avatar: u.name.charAt(0).toUpperCase(),
            avatarUrl: u.avatarUrl,
            metadata: `${u.role} ${getUserDisplaySkills(u)}`
        }))
    ];

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

                    {browserInsight && !dataRef.current && (
                        <div className="mb-3 rounded-md border border-blue-200/80 dark:border-blue-800 bg-white/70 dark:bg-slate-900/40 px-3 py-2 text-[11px] text-blue-900 dark:text-blue-100">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">Browser Analysis</span>
                                <span className="rounded bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px]">
                                    {browserInsight.predictedPriority} priority
                                </span>
                                <span className="text-blue-700 dark:text-blue-300">
                                    {Math.round(browserInsight.confidence * 100)}% confidence
                                </span>
                                {browserInsight.topCandidateName && (
                                    <span className="text-blue-700 dark:text-blue-300">
                                        Best fit: {browserInsight.topCandidateName}
                                    </span>
                                )}
                            </div>
                            {browserInsight.detectedSkills.length > 0 && (
                                <div className="mt-1 text-blue-700 dark:text-blue-300">
                                    Detected skills: {browserInsight.detectedSkills.join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    <CustomSelect
                        options={assigneeOptions}
                        value={assigneeId}
                        onChange={setAssigneeId}
                        placeholder={loadingUsers ? 'Loading members...' : 'Select Assignee'}
                        disabled={loadingUsers || isMember}
                        searchPlaceholder="Search by name or skills..."
                    />

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
                                    {(dataRef.current?.allCandidates || []).map((c: any, idx: number) => (
                                        <div key={c.id || idx} className="flex justify-between gap-3">
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
                        <CustomSelect
                            options={statusOptions}
                            value={status}
                            onChange={(val) => setStatus(val as Status)}
                            searchable={false}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                        <CustomSelect
                            options={priorityOptions}
                            value={priority}
                            onChange={(val) => setPriority(val as Priority)}
                            searchable={false}
                        />
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
