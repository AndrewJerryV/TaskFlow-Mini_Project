import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api/fetchWithSupabase';

interface AddUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddUserDialog({ isOpen, onClose, onSuccess }: AddUserDialogProps) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: 'TaskFlow@123',
        role: 'Member',
        dob: '',
        maxWorkload: 5,
    });
    const [skillInputs, setSkillInputs] = useState<{ name: string, exp: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            apiFetch('/api/autocomplete')
                .then(res => res.json())
                .then(data => setSuggestions(data.skills || []))
                .catch(console.error);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const skillExperience: Record<string, number> = {};
            skillInputs.forEach(skill => {
                const trimmed = skill.name.trim();
                if (trimmed) {
                    skillExperience[trimmed] = skill.exp;
                }
            });

            const res = await apiFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password || 'TaskFlow@123',
                    role: formData.role,
                    dob: formData.dob || undefined,
                    skillExperience,
                    maxWorkload: formData.maxWorkload,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create user');
            }

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                fullName: '',
                email: '',
                password: 'TaskFlow@123',
                role: 'Member',
                dob: '',
                maxWorkload: 5,
            });
            setSkillInputs([]);
        } catch (err: any) {
            setError(err.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Team Member</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0">
                    <div className="p-4 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="e.g. Jane Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email / GitHub *
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="joe@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Temporary Password
                            </label>
                            <input
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="TaskFlow@123"
                            />
                            <p className="text-xs text-gray-500 mt-1">Users can use this to sign in initially.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Role *
                            </label>
                            <CustomSelect
                                value={formData.role}
                                onChange={(val: string) => setFormData({ ...formData, role: val })}
                                options={[
                                    { value: 'Member', label: 'Member' },
                                    { value: 'Manager', label: 'Manager' },
                                    { value: 'Admin', label: 'Admin' }
                                ]}
                                required
                                searchable={false}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Date of Birth *
                            </label>
                            <input
                                type="date"
                                required
                                max={new Date().toISOString().split('T')[0]}
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Skills & Experience
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setSkillInputs([...skillInputs, { name: '', exp: 1 }])}
                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                >
                                    + Add Skill
                                </button>
                            </div>
                            {skillInputs.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No skills added yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {skillInputs.map((skill, index) => (
                                        <div key={index} className="flex gap-2">
                                            <AutocompleteInput
                                                options={suggestions}
                                                value={skill.name}
                                                onChange={(e) => {
                                                    const newInputs = [...skillInputs];
                                                    newInputs[index].name = e.target.value;
                                                    setSkillInputs(newInputs);
                                                }}
                                                placeholder="Skill (e.g. React)"
                                                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-sm dark:text-white"
                                            />
                                            <div className="flex items-center gap-1 w-24">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={skill.exp}
                                                    onChange={(e) => {
                                                        const newInputs = [...skillInputs];
                                                        newInputs[index].exp = parseInt(e.target.value) || 0;
                                                        setSkillInputs(newInputs);
                                                    }}
                                                    className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-sm"
                                                />
                                                <span className="text-xs text-gray-500">yrs</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newInputs = [...skillInputs];
                                                        newInputs.splice(index, 1);
                                                        setSkillInputs(newInputs);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 px-1"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>



                    </div>

                    <div className="p-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
