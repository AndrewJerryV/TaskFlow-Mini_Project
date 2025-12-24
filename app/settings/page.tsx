'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const themeOptions = [
        { value: 'Light' as const, label: 'Light', icon: Sun },
        { value: 'Dark' as const, label: 'Dark', icon: Moon },
        { value: 'System' as const, label: 'System', icon: Monitor },
    ];

    return (
        <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Workspace Settings</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">General</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace Name</label>
                            <input
                                type="text"
                                defaultValue="My Software Team"
                                className="max-w-md w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace URL</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                                    taskflow.app/
                                </span>
                                <input
                                    type="text"
                                    disabled
                                    value="my-software-team"
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preferences</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Choose your interface appearance.</p>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                            {themeOptions.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setTheme(value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${theme === value
                                            ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white font-medium'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );
}
