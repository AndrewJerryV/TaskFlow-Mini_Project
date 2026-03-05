'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { CreateProjectDialog } from '@/components/forms/CreateProjectDialog';
import { useAuth } from '@/contexts/AuthContext';
import { getUserName, getActionDisplay } from '@/lib/utils';
import { Sparkles, ArrowRight, Trash2, MessageSquare, Edit } from 'lucide-react';

// Icon component to render Lucide icons by name
const ActionIcon = ({ iconName, size = 14 }: { iconName: string; size?: number }) => {
  switch (iconName) {
    case 'Sparkles': return <Sparkles size={size} />;
    case 'ArrowRight': return <ArrowRight size={size} />;
    case 'Trash2': return <Trash2 size={size} />;
    case 'MessageSquare': return <MessageSquare size={size} />;
    case 'Edit': return <Edit size={size} />;
    default: return <Edit size={size} />;
  }
};

type ProjectWithStats = Project & {
  stats: {
    totalTasks: number;
    doneTasks: number;
    progress: number;
  }
};

export default function Home() {
  const { currentUser, users } = useAuth();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/projects?userId=${currentUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [currentUser?.id]);

  const getOwnerName = (ownerId: string) => getUserName(users, ownerId);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Your Work</h1>
        {currentUser && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, <span className="font-medium text-gray-700 dark:text-gray-300">{currentUser.name}</span>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* Recent Projects Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Active Projects</h2>

        {loading ? (
          <div className="text-sm text-gray-400 dark:text-gray-500">Loading projects...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {projects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer h-36 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-start space-x-3 z-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-600 rounded flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {project.key}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{project.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{project.description}</p>
                    </div>
                    {currentUser?.role === 'Admin' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this project?')) {
                            fetch(`/api/projects?id=${project.id}&userId=${currentUser?.id}`, { method: 'DELETE' })
                              .then((res) => {
                                if (res.ok) {
                                  setProjects(prev => prev.filter(p => p.id !== project.id));
                                } else {
                                  alert('Failed to delete project');
                                }
                              })
                              .catch(console.error);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete Project"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                      </button>
                    )}
                  </div>

                  <div className="z-10">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Owner: {getOwnerName(project.ownerId)}</span>
                      <span>{project.stats.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${project.stats.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Create New Project Card */}
            {currentUser?.role === 'Admin' && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 h-36 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all hover:bg-blue-50/10 dark:hover:bg-blue-900/10"
              >
                <span className="text-2xl mb-1">+</span>
                <span className="text-sm font-medium">Create Project</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Recent Activity Section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Activity Feed</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <ActivityFeedList users={users} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityFeedList({ users }: { users: any[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/activity?userId=${currentUser.id}`)
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [currentUser?.id]);

  const getLocalUserName = (userId: string) => getUserName(users, userId);

  if (logs.length === 0) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-500 italic">No recent activity</div>;
  }

  return (
    <>
      {logs.slice(0, 5).map((log: any) => {
        const actionInfo = getActionDisplay(log.action);
        return (
          <div key={log.id} className="p-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-default">
            <div className={`w-8 h-8 mr-4 flex items-center justify-center rounded-sm ${actionInfo.bgColor}`}>
              <ActionIcon iconName={actionInfo.iconName} size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{log.details}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getLocalUserName(log.userId)} • {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}