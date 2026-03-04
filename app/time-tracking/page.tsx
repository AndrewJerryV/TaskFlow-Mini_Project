'use client';

import React from 'react';
import TimeTrackingView from '@/components/TimeTrackingView';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';

export default function GlobalTimeTrackingPage() {
    return (
        <AuthenticatedLayout>
            <div className="flex-1 overflow-auto p-6 bg-gray-50/30 dark:bg-gray-900">
                <TimeTrackingView />
            </div>
        </AuthenticatedLayout>
    );
}
