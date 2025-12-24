'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { CreateProjectDialog } from '@/components/forms/CreateProjectDialog';
import { useAuth } from '@/contexts/AuthContext';

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
      try {
        const res = await fetch('/api/projects');
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
  }, []);

  const getOwnerName = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId);
    return owner?.name || 'Unknown';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Your Work</h1>
        {currentUser && (
          <div className="text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-700">{currentUser.name}</span>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* Recent Projects Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Active Projects</h2>

        {loading ? (
          <div className="text-sm text-gray-400">Loading projects...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {projects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer h-36 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-start space-x-3 z-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {project.key}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{project.description}</p>
                    </div>
                  </div>

                  <div className="z-10">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Owner: {getOwnerName(project.ownerId)}</span>
                      <span>{project.stats.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${project.stats.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Create New Project Card */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-36 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all hover:bg-blue-50/10"
            >
              <span className="text-2xl mb-1">+</span>
              <span className="text-sm font-medium">Create Project</span>
            </button>
          </div>
        )}
      </section>

      {/* Recent Activity Section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Activity Feed</h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-100">
            <ActivityFeedList users={users} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityFeedList({ users }: { users: any[] }) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/activity')
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || (userId === 'system' ? 'System' : 'Unknown');
  };

  if (logs.length === 0) {
    return <div className="p-8 text-center text-gray-400 italic">No recent activity</div>;
  }

  return (
    <>
      {logs.slice(0, 10).map((log: any) => (
        <div key={log.id} className="p-4 flex items-center hover:bg-gray-50 from-gray-50 to-white transition-colors cursor-default">
          <div className={`w-8 h-8 mr-4 flex items-center justify-center rounded-sm text-lg ${log.action === 'Created' ? 'bg-green-100 text-green-600' :
            log.action === 'Moved' ? 'bg-blue-100 text-blue-600' :
              log.action === 'Deleted' ? 'bg-red-100 text-red-600' :
                log.action === 'Commented' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
            }`}>
            {log.action === 'Created' ? '✨' :
              log.action === 'Moved' ? '➡️' :
                log.action === 'Deleted' ? '🗑️' :
                  log.action === 'Commented' ? '💬' : '📝'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{log.details}</p>
            <p className="text-xs text-gray-500">
              {getUserName(log.userId)} • {new Date(log.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}