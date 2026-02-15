'use client';

import React from 'react';
import { BurnoutDashboard } from '@/components/BurnoutDashboard';
import { BottleneckAlert } from '@/components/BottleneckAlert';
import { TaskOfTheDay } from '@/components/TaskOfTheDay';

export default function GapFeaturesDemo() {
    const [userId, setUserId] = React.useState<string>('');

    React.useEffect(() => {
        // Fetch first user to use for demo
        fetch('/api/users')
            .then(res => res.json())
            .then(users => {
                if (Array.isArray(users) && users.length > 0) {
                    setUserId(users[0].id);
                }
            })
            .catch(console.error);
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    🚀 Gap Features Demo
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
                    This page demonstrates the 3 new "Gap Analysis" features implemented to address
                    burnout, process bottlenecks, and AI task prioritization.
                </p>
            </div>

            {/* Feature 1: ML Task Recommendation */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        1. AI Task of the Day
                    </h2>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Personalized AI
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <p className="text-sm text-gray-500 mb-4">
                            <strong>Logic:</strong> Scores tasks based on deadline (overdue/due soon),
                            priority (Critical/High), and status (In Progress).
                            It picks the single most impactful task for you to focus on.
                        </p>
                        <p className="text-sm text-gray-500">
                            <strong>Try it:</strong> Toggle tasks in the database to see recommendation change.
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <TaskOfTheDay userId={userId} />
                    </div>
                </div>
            </section>

            {/* Feature 2: Bottleneck Detection */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        2. Bottleneck Detection
                    </h2>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        Process Analytics
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <p className="text-sm text-gray-500 mb-4">
                            <strong>Logic:</strong> Distinguishes between:
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1 mb-4">
                            <li><strong>Process Issues:</strong> Column overflow (e.g., too many tasks in 'Review')</li>
                            <li><strong>Person Issues:</strong> Stale tasks assigned to a specific user for {'>'}5 days.</li>
                        </ul>
                    </div>
                    <div className="md:col-span-2">
                        <BottleneckAlert />
                    </div>
                </div>
            </section>

            {/* Feature 3: Burnout Dashboard */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        3. Team Burnout Monitor
                    </h2>
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Wellness Tracking
                    </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1">
                        <p className="text-sm text-gray-500 mb-4">
                            <strong>Logic:</strong> Calculates 'Burnout Risk' by combining:
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1 mb-4">
                            <li><strong>Workload Capacity:</strong> (Active Tasks / Max Capacity)</li>
                            <li><strong>Wellness Score:</strong> Self-reported or AI-inferred health metric.</li>
                        </ul>
                        <p className="text-sm text-gray-500">
                            Flags users as <strong>High Risk</strong> if over capacity or low wellness.
                        </p>
                    </div>
                    <div className="lg:col-span-3">
                        <BurnoutDashboard />
                    </div>
                </div>
            </section>
        </div>
    );
}
