// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { AlertCircle } from 'lucide-react';

type ProjectWithStats = Project & {
  stats: {
    totalTasks: number;
    doneTasks: number;
    progress: number;
  }
};

export default function Home() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/projects');
        if (!res.ok) {
          throw new Error(`Failed to fetch projects: ${res.statusText}`);
        }
        const data = await res.json();
        setProjects(data);
        setError(null);
      } catch (err) {
        console.error('Project Fetch Error:', err);
        setError('Connection failed. Please check your database settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Your Work</h1>

      {/* Recent Projects Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Active Projects</h2>

        {loading ? (
          <div className="text-sm text-gray-400">Loading projects...</div>
        ) : error ? (
          <div className="flex items-center p-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50" role="alert">
            <AlertCircle className="flex-shrink-0 inline w-4 h-4 me-3" />
            <span className="sr-only">Error</span>
            <div>
              <span className="font-medium">System Unavailable:</span> {error}
            </div>
          </div>
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
                      <span>Progress</span>
                      <span>{project.stats?.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${project.stats?.progress || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Create New Project Card */}
            <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-36 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all hover:bg-blue-50/10">
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
            <ActivityFeedList />
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityFeedList() {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/activity')
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(data => setLogs(data))
      .catch(err => {
        console.error(err);
        setError(true);
      });
  }, []);

  if (error) {
    return <div className="p-8 text-center text-red-400 text-sm">Unable to load activity feed.</div>;
  }

  if (logs.length === 0) {
    return <div className="p-8 text-center text-gray-400 italic">No recent activity</div>;
  }

  return (
    <>
      {logs.slice(0, 5).map((log: any) => (
        <div key={log.id} className="p-4 flex items-center hover:bg-gray-50 from-gray-50 to-white transition-colors cursor-default">
          <div className={`w-8 h-8 mr-4 flex items-center justify-center rounded-sm text-lg ${log.action === 'Created' ? 'bg-green-100 text-green-600' :
            log.action === 'Moved' ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-600'
            }`}>
            {log.action === 'Created' ? '✨' : log.action === 'Moved' ? '➡️' : '📝'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{log.details}</p>
            <p className="text-xs text-gray-500">
              {log.userId === 'system' ? 'System' : 'User'} • {new Date(log.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}