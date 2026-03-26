import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

interface CreateProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

// User with live wellness score from /api/team
type LiveUser = User & { stats?: { activeTasks: number; utilization: number; status: string } };

function WellnessBadge({ score, loading }: { score: number; loading?: boolean }) {
    if (loading) {
        return <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 animate-pulse">♥ …</span>;
    }
    const color =
        score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
        score >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    return (
        <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded ${color}`}>
            ♥ {score}%
        </span>
    );
}

export function CreateProjectDialog({ isOpen, onClose }: CreateProjectDialogProps) {
    const { currentUser, users } = useAuth();
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [manualKey, setManualKey] = useState(false);
    const [description, setDescription] = useState('');
    const [managerId, setManagerId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
    const [wellnessLoading, setWellnessLoading] = useState(false);
    const router = useRouter();

    // Fetch real-time wellness scores from /api/team when dialog opens
    useEffect(() => {
        if (!isOpen) return;
        setWellnessLoading(true);
        fetch(`/api/team${currentUser?.id ? `?userId=${currentUser.id}` : ''}`)
            .then(r => r.ok ? r.json() : null)
            .then((data: LiveUser[] | null) => {
                if (data) setLiveUsers(data);
                else setLiveUsers(users as LiveUser[]);
            })
            .catch(() => setLiveUsers(users as LiveUser[]))
            .finally(() => setWellnessLoading(false));
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Resolve user with live wellness (fall back to AuthContext user if not in teamData)
    const resolved = (base: User): LiveUser => {
        return liveUsers.find(u => u.id === base.id) ?? (base as LiveUser);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, key, description,
                    ownerId: currentUser?.id,
                    managerId: managerId || currentUser?.id,
                    memberIds: selectedMembers
                })
            });
            if (res.ok) {
                const project = await res.json();
                onClose();
                setName(''); setKey(''); setDescription(''); setManagerId(''); setSelectedMembers([]); setManualKey(false);
                router.push(`/projects/${project.id}`);
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Managers sorted by live wellness descending
    const sortedManagers = users
        .filter(u => u.role === 'Manager')
        .map(resolved)
        .sort((a, b) => (b.wellnessScore ?? 0) - (a.wellnessScore ?? 0));

    // Members sorted by live wellness descending, filtered by name/email/skills
    const q = searchQuery.toLowerCase();
    const filteredMembers = users
        .filter(u => u.id !== currentUser?.id && u.role === 'Member')
        .map(resolved)
        .sort((a, b) => (b.wellnessScore ?? 0) - (a.wellnessScore ?? 0))
        .filter(u =>
            !q ||
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.skills ?? []).some(s => s.toLowerCase().includes(q))
        );

    const UserRow = ({
        user,
        control,
    }: {
        user: LiveUser;
        control: React.ReactNode;
    }) => {
        const matchedSkills = q ? (user.skills ?? []).filter(s => s.toLowerCase().includes(q)) : [];
        return (
            <label className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors">
                {control}
                <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</span>
                        {matchedSkills.length > 0 && (
                            <span className="text-xs text-blue-500 dark:text-blue-400 truncate">· {matchedSkills.join(', ')}</span>
                        )}
                    </div>
                    {(user.skills ?? []).length > 0 && !q && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {user.skills.slice(0, 3).join(', ')}{user.skills.length > 3 ? ` +${user.skills.length - 3}` : ''}
                        </p>
                    )}
                </div>
                <WellnessBadge score={user.wellnessScore ?? 0} loading={wellnessLoading} />
            </label>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Project">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Mobile App Redesign"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (!manualKey) {
                                if (!e.target.value) {
                                    setKey('');
                                } else {
                                    const initials = e.target.value
                                        .trim()
                                        .split(/\s+/)
                                        .slice(0, 3)
                                        .map(w => w.charAt(0).toUpperCase())
                                        .join('');
                                    setKey(initials);
                                }
                            }
                        }}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="MOB"
                        value={key}
                        onChange={(e) => { setManualKey(true); setKey(e.target.value.substring(0, 10).toUpperCase()); }}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                        placeholder="Project goals..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Manager selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Project Manager <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-1 max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-2">
                        {sortedManagers.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No managers available.</p>
                        )}
                        {sortedManagers.map(user => (
                            <UserRow
                                key={user.id}
                                user={user}
                                control={
                                    <input
                                        type="radio"
                                        name="managerId"
                                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700 shrink-0"
                                        checked={managerId === user.id}
                                        onChange={() => setManagerId(user.id)}
                                        required={!managerId}
                                    />
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* Team Members */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Members</label>
                    <input
                        type="text"
                        placeholder="Search by name, email, or skill…"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 placeholder-gray-400 dark:placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="space-y-1 max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-2">
                        {filteredMembers.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No members match your search.</p>
                        )}
                        {filteredMembers.map(user => {
                            const isSelected = selectedMembers.includes(user.id);
                            return (
                                <UserRow
                                    key={user.id}
                                    user={user}
                                    control={
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700 shrink-0"
                                            checked={isSelected}
                                            onChange={() => {
                                                if (isSelected) setSelectedMembers(prev => prev.filter(id => id !== user.id));
                                                else setSelectedMembers(prev => [...prev, user.id]);
                                            }}
                                        />
                                    }
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-colors">
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
