'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
    const [workspaceName, setWorkspaceName] = useState('My Software Team');
    const [theme, setTheme] = useState('Light');

    return (
        <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Workspace Settings</h1>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">General</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Workspace Name</label>
                            <input
                                type="text"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                className="max-w-md w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Workspace URL</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    taskflow.app/
                                </span>
                                <input
                                    type="text"
                                    disabled
                                    value="my-software-team"
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 bg-gray-50 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Preferences</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Theme</h3>
                            <p className="text-sm text-gray-500">Choose your interface appearance.</p>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['Light', 'Dark', 'System'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${theme === t ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex justify-end">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );
}
