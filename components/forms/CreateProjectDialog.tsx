import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface CreateProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateProjectDialog({ isOpen, onClose }: CreateProjectDialogProps) {
    const { currentUser, users } = useAuth();
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [managerId, setManagerId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    key,
                    description,
                    ownerId: currentUser?.id,
                    managerId: managerId || currentUser?.id, // Default to creator if no manager selected
                    memberIds: selectedMembers
                })
            });

            if (res.ok) {
                const project = await res.json();
                onClose();
                setName('');
                setKey('');
                setDescription('');
                setManagerId('');
                setSelectedMembers([]);
                router.push(`/projects/${project.id}`);
                // Force router refresh to update sidebar
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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
                            // Auto-generate key
                            if (!key) {
                                setKey(e.target.value.substring(0, 3).toUpperCase());
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
                        onChange={(e) => setKey(e.target.value.substring(0, 10).toUpperCase())}
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
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Manager <span className="text-red-500">*</span></label>
                    <CustomSelect
                        value={managerId}
                        onChange={setManagerId}
                        options={[
                            { value: '', label: 'Select a Manager' },
                            ...users
                                .filter(u => u.role === 'Manager')
                                .map(user => ({
                                    value: user.id,
                                    label: user.name,
                                    metadata: user.role,
                                    avatar: user.name.charAt(0).toUpperCase(),
                                    avatarUrl: user.avatarUrl
                                }))
                        ]}
                        placeholder="Select a Manager"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Members</label>
                    <input
                        type="text"
                        placeholder="Search members..."
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 placeholder-gray-400 dark:placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-2">
                        {users
                            .filter(u => u.id !== currentUser?.id)
                            .filter(u => u.role === 'Member')
                            .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(user => {
                                const isSelected = selectedMembers.includes(user.id);
                                return (
                                    <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                                            checked={isSelected}
                                            onChange={() => {
                                                if (isSelected) {
                                                    setSelectedMembers(prev => prev.filter(id => id !== user.id));
                                                } else {
                                                    setSelectedMembers(prev => [...prev, user.id]);
                                                }
                                            }}
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                                            </div>
                                        </div>
                                    </label>
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
