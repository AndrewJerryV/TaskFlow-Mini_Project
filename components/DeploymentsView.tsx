'use client';

import React from 'react';
import { Rocket } from 'lucide-react';

interface DeploymentsViewProps {
    projectId: string;
}

export default function DeploymentsView({ projectId }: DeploymentsViewProps) {
    return (
        <div className="flex flex-col items-center justify-center h-96">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Rocket size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Deployments</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                Deployment management coming soon. Configure your CI/CD pipelines and monitor deployment status here.
            </p>
        </div>
    );
}
