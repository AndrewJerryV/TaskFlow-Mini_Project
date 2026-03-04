'use client';

import { User } from '@/types';
import { calculateAge } from '@/lib/utils';
import { Pencil } from 'lucide-react';
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
                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
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

            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Skills</h4>
                </div>
                <div className="flex flex-wrap gap-1">
                    {user.skills && user.skills.length > 0 ? (
                        user.skills.map((skill, idx) => {
                            const exp = user.skillExperience ? user.skillExperience[skill] : undefined;
                            return (
                                <span key={idx} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded inline-flex items-center gap-1">
                                    {skill}
                                    {exp !== undefined && (
                                        <span className="text-gray-400 dark:text-gray-500 font-medium">({exp}y)</span>
                                    )}
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-xs text-gray-400 italic">No skills listed</span>
                    )}
                </div>
            </div>
        </div>
    );
}
