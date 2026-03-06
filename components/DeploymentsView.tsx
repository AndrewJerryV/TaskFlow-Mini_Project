'use client';

import React, { useState, useEffect } from 'react';
import { Rocket, Plus, Activity, Server, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Deployment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CreateDeploymentDialog } from './forms/CreateDeploymentDialog';

interface DeploymentsViewProps {
    projectId: string;
}

export default function DeploymentsView({ projectId }: DeploymentsViewProps) {
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { currentUser } = useAuth();

    const fetchDeployments = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/deployments?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setDeployments(data);
            }
        } catch (error) {
            console.error('Error fetching deployments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchDeployments();
        }
    }, [projectId]);

    const handleDeploymentCreated = () => {
        fetchDeployments();
    };

    const isManagerOrAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

    // Analytics
    const totalDeployments = deployments.length;
    const latestDeployment = deployments[0]; // Assuming API returns sorted descending by created_at

    const envBreakdown = {
        Production: deployments.filter(d => d.environment === 'Production').length,
        Staging: deployments.filter(d => d.environment === 'Staging').length,
        Development: deployments.filter(d => d.environment === 'Development').length,
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'Failed': return <XCircle size={16} className="text-red-500" />;
            case 'In Progress': return <Clock size={16} className="text-blue-500 animate-pulse" />;
            default: return null;
        }
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-x border-gray-200 dark:border-gray-800">
            <div className="p-4 sm:bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Rocket className="text-indigo-600 dark:text-indigo-400" size={20} />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Deployments</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage project releases</p>
                    </div>
                </div>
                {isManagerOrAdmin && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Log Deployment</span>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:space-y-6">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                        <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                        <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                        <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                    </div>
                ) : (
                    <>
                        {deployments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                    <Rocket size={32} className="text-gray-400 dark:text-gray-500" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No deployments yet</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                                    {isManagerOrAdmin ? "Get started by logging your first deployment to track releases against your tasks." : "No deployments have been recorded for this project yet."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Dashboard Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Deployments</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDeployments}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Latest Release</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{latestDeployment?.version || 'N/A'}</p>
                                                {latestDeployment && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${latestDeployment.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                        latestDeployment.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                                        }`}>
                                                        {latestDeployment.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 hidden sm:flex">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Environment Breakdown</p>
                                            <div className="flex gap-2 text-xs">
                                                <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                                                    <span className="font-semibold">{envBreakdown.Production}</span> Prod
                                                </div>
                                                <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                                                    <span className="font-semibold">{envBreakdown.Staging}</span> Stg
                                                </div>
                                                <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                                                    <span className="font-semibold">{envBreakdown.Development}</span> Dev
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Deployment History */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Deployment History</h3>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {deployments.map((deployment) => (
                                            <div key={deployment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${deployment.environment === 'Production' ? 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' :
                                                            deployment.environment === 'Staging' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                                                            }`}>
                                                            <Server size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-medium text-gray-900 dark:text-white text-lg">{deployment.version}</h4>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${deployment.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                                    deployment.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                                                    }`}>
                                                                    {getStatusIcon(deployment.status)}
                                                                    {deployment.status}
                                                                </span>
                                                                <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                                    {deployment.environment}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                                Started at {formatDate(deployment.createdAt)}
                                                            </p>
                                                            {deployment.releaseNotes && (
                                                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800">
                                                                    {deployment.releaseNotes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            <CreateDeploymentDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                currentProjectId={projectId}
                onDeploymentCreated={handleDeploymentCreated}
            />
        </div>
    );
}
