import { useState, useEffect } from 'react';
import { User } from '@/types';
import { calculateAge } from '@/lib/utils';
import { Pencil, Github, GitPullRequest, CircleDot, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserStatsCardProps {
    user: User & {
        stats: {
            activeTasks: number;
            utilization: number;
            status: string;
        }
    };
    onClick?: () => void;
    onEditSkills?: (e: React.MouseEvent) => void;
}

export function UserStatsCard({ user, onClick, onEditSkills }: UserStatsCardProps) {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'Admin';
    const { stats, dob } = user;
    const age = calculateAge(dob);
    
    const [githubStats, setGithubStats] = useState<{ issues: number, prs: number, actions: number } | null>(null);
    const [loadingGithub, setLoadingGithub] = useState(true);

    useEffect(() => {
        const fetchGithubStats = async () => {
            try {
                const res = await fetch(`/api/github/user/${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setGithubStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch Github stats for user", user.id);
            } finally {
                setLoadingGithub(false);
            }
        };
        fetchGithubStats();
    }, [user.id]);

    // Determine color based on status/wellness
    const getWellnessColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
    };

    const getWorkloadColor = (utilization: number) => {
        if (utilization > 100) return 'bg-red-500';
        if (utilization > 80) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {user.avatarUrl ? (
                        <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className="w-10 h-10 rounded-full" 
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`; }}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                            {user.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</span>
                        </div>
                    </div>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${getWellnessColor(user.wellnessScore)}`}>
                    {user.wellnessScore}% Wellness
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Workload ({stats.activeTasks} active tasks)</span>
                    <span>{stats.utilization}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-500 ${getWorkloadColor(stats.utilization)}`}
                        style={{ width: `${Math.min(stats.utilization, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* GitHub Stats Section */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Github size={14} className="text-gray-500 dark:text-gray-400" />
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">GitHub Activity</h4>
                </div>
                
                {loadingGithub ? (
                    <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    </div>
                ) : githubStats ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 flex flex-col items-center justify-center">
                            <CircleDot size={14} className="text-green-500 mb-1" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{githubStats.issues}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Issues</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 flex flex-col items-center justify-center">
                            <GitPullRequest size={14} className="text-purple-500 mb-1" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{githubStats.prs}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">PRs</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 flex flex-col items-center justify-center">
                            <Activity size={14} className="text-blue-500 mb-1" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{githubStats.actions}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Actions</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-1">
                        No GitHub data available
                    </div>
                )}
            </div>
        </div>
    );
}
