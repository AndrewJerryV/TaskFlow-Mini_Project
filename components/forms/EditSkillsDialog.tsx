'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { User } from '@/types';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';

interface EditSkillsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

export function EditSkillsDialog({ isOpen, onClose, onSuccess, user }: EditSkillsDialogProps) {
    const [skillInputs, setSkillInputs] = useState<{ name: string, exp: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/autocomplete')
                .then(res => res.json())
                .then(data => setSuggestions(data.skills || []))
                .catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && user) {
            const initialSkills = user.skills.map(skill => ({
                name: skill,
                exp: user.skillExperience?.[skill] || 0
            }));
            setSkillInputs(initialSkills.length > 0 ? initialSkills : [{ name: '', exp: 1 }]);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const skills: string[] = [];
            const skillExperience: Record<string, number> = {};

            skillInputs.forEach(skill => {
                const trimmed = skill.name.trim();
                if (trimmed) {
                    skills.push(trimmed);
                    skillExperience[trimmed] = skill.exp;
                }
            });

            const response = await fetch(`/api/users/${user.id}/skills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skills, skillExperience })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update skills');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update skills');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Skills: {user.name}</h2>
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

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Skills & Experience
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setSkillInputs([...skillInputs, { name: '', exp: 1 }])}
                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Skill
                                </button>
                            </div>

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
                                                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-sm dark:text-white"
                                            />
                                            <span className="text-xs text-gray-500">y</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newInputs = [...skillInputs];
                                                    newInputs.splice(index, 1);
                                                    setSkillInputs(newInputs);
                                                }}
                                                className="text-gray-400 hover:text-red-500 px-1 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
