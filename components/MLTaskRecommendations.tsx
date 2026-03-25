'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Task, User } from '@/types';
import { Sparkles, ArrowRight, BrainCircuit, TrendingUp, Calendar, AlertCircle, ArrowDown, Loader2, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { BottleneckAlert } from '@/components/BottleneckAlert';
import { Modal } from '@/components/ui/Modal';
import { useTimer } from '@/contexts/TimerContext';

interface Recommendation {
  id: string;
  taskId?: string;
  type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk';
  title: string;
  description: string;
  score: number;
  reason: string;
  suggestedAction?: string;
  aiInsight?: string;
}

interface TaskCluster {
  taskIds: string[];
  tasks: { id: string; title: string; similarity: number }[];
  size: number;
}

interface MLTaskRecommendationsProps {
  tasks: Task[];
  projectId: string;
  users: User[];
  currentUser: User | null;
  onTaskUpdate?: (task: Task) => Promise<void> | void;
}

export default function MLTaskRecommendations({ tasks, projectId, users, currentUser, onTaskUpdate }: MLTaskRecommendationsProps) {
  const router = useRouter();
  const { activeTimer, startTimer, stopTimer } = useTimer();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [taskClusters, setTaskClusters] = useState<TaskCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [mlPowered, setMlPowered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState<{ isOpen: boolean, task: Task | null, days: string }>({ isOpen: false, task: null, days: '1' });
  const [isApplyingAction, setIsApplyingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [clustersExpanded, setClustersExpanded] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);
  const bottlenecksRef = useRef<HTMLDivElement>(null);

  const tasksSignature = tasks.map(t => `${t.id}-${t.updatedAt}-${t.status}`).join('|');

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ projectId });
        if (currentUser?.id) {
          if (currentUser.role === 'Member') {
            params.set('filterByUserId', "true");
          }
          params.set('userId', currentUser.id);
        }

        const res = await fetch(`/api/ml/recommendations?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) throw new Error('Failed to fetch recommendations');

        setRecommendations(data.recommendations || []);
        setTaskClusters(data.taskClusters || []);
        setMlPowered(data.mlPowered || false);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [tasksSignature, currentUser?.id, projectId]);

  const applyTaskUpdate = async (task: Task) => {
    if (!onTaskUpdate) {
      throw new Error('Task update handler is not available.');
    }

    await onTaskUpdate(task);
  };

  const handleAction = async (rec: Recommendation) => {
    if (!onTaskUpdate) return;
    setActionError(null);
    const task = tasks.find(t => t.id === rec.taskId);
    if (!task) return;

    const actionKey = `${rec.id}-${rec.suggestedAction || 'action'}`;
    setIsApplyingAction(actionKey);

    try {
      if (rec.suggestedAction === 'Continue') {
        await applyTaskUpdate({ ...task, status: 'In Progress' });

        if (activeTimer?.taskId !== task.id) {
          if (activeTimer) {
            await stopTimer();
          }
          startTimer(task);
        }

        router.push(`/projects/${task.projectId}?tab=Backlog&task=${task.id}`);
      } else if (rec.suggestedAction === 'Reschedule') {
        setRescheduleData({ isOpen: true, task, days: '1' });
      }
    } catch (err) {
      console.error('Failed to apply recommendation action:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to apply action.');
    } finally {
      setIsApplyingAction(null);
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleData.task) return;
    const days = parseInt(rescheduleData.days, 10);
    if (isNaN(days) || days < 1) {
      setActionError('Please enter a valid number of days (minimum 1).');
      return;
    }

    setActionError(null);
    setIsApplyingAction(`reschedule-${rescheduleData.task.id}`);

    try {
      const newDate = rescheduleData.task.dueDate ? new Date(rescheduleData.task.dueDate) : new Date();
      newDate.setDate(newDate.getDate() + days);
      await applyTaskUpdate({ ...rescheduleData.task, dueDate: newDate.toISOString() });
      setRescheduleData({ isOpen: false, task: null, days: '1' });
    } catch (err) {
      console.error('Failed to reschedule task:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to reschedule task.');
    } finally {
      setIsApplyingAction(null);
    }
  };

  const scrollToBottlenecks = () => {
    bottlenecksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
        <span>Analyzing your project...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BrainCircuit size={18} className="text-indigo-600 dark:text-indigo-400" />
              Recommended Actions
            </h2>
            <button
              onClick={scrollToBottlenecks}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <ArrowDown size={12} />
              Jump to Bottlenecks
            </button>
          </div>
        </div>

        {/* AI Task Clusters */}
        {taskClusters.length > 0 && (
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 border border-violet-200 dark:border-violet-800/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setClustersExpanded(!clustersExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                  Related Tasks Detected
                </span>
                <span className="text-xs bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full font-medium">
                  {taskClusters.length} {taskClusters.length === 1 ? 'group' : 'groups'}
                </span>
                <span className="text-[10px] text-violet-500 dark:text-violet-400 flex items-center gap-1">
                  <Sparkles size={10} /> AI Detected
                </span>
              </div>
              {clustersExpanded ? <ChevronUp size={14} className="text-violet-400" /> : <ChevronDown size={14} className="text-violet-400" />}
            </button>

            {clustersExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {taskClusters.map((cluster, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800/60 rounded-md p-3 border border-violet-100 dark:border-violet-800/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-violet-600 dark:text-violet-400 font-semibold">
                        {cluster.size} related tasks
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Consider batching these, they share similar scope</span>
                    </div>
                    <div className="space-y-1">
                      {cluster.tasks.map(t => (
                        <div key={t.id} className="flex items-center text-sm group/task">
                          <button
                            onClick={() => router.push(`/projects/${projectId}?tab=Backlog&task=${t.id}`)}
                            className="text-gray-700 dark:text-gray-300 truncate pr-3 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left transition-colors"
                          >
                            {t.title}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            {error}
          </div>
        )}

        {actionError && (
          <div className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            {actionError}
          </div>
        )}

        {recommendations.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-900 dark:text-white font-medium">No immediate recommendations</h3>
            <p className="text-gray-500 text-sm mt-1">Your project execution is on track.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {(showAllRecs ? recommendations : recommendations.slice(0, 5)).map(rec => (
              <div key={rec.id} className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4 overflow-hidden">
                  <div className={`mt-1 p-2 rounded-md flex-shrink-0 ${rec.type === 'focus' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                    rec.type === 'bottleneck' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                      rec.type === 'overdue_risk' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                        'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                    {rec.type === 'focus' && <TrendingUp size={18} />}
                    {rec.type === 'bottleneck' && <AlertCircle size={18} />}
                    {rec.type === 'overdue_risk' && <Calendar size={18} />}
                    {rec.type === 'quick_win' && <Sparkles size={18} />}
                  </div>

                  <div className="min-w-0">
                    <span className={`text-xs font-bold uppercase tracking-wider ${rec.type === 'focus' ? 'text-blue-700 dark:text-blue-300' :
                      rec.type === 'bottleneck' ? 'text-orange-700 dark:text-orange-300' :
                        rec.type === 'overdue_risk' ? 'text-red-700 dark:text-red-300' :
                          'text-green-700 dark:text-green-300'
                      }`}>
                      {rec.type.replace('_', ' ')}
                    </span>

                    <button
                      onClick={() => router.push(`/projects/${projectId}?tab=Backlog&task=${rec.taskId}`)}
                      className="text-base font-semibold text-gray-900 dark:text-white truncate pr-4 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors text-left w-full mt-1"
                    >
                      {rec.title}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 pl-4 border-l border-gray-100 dark:border-gray-700">
                  {(rec.suggestedAction === 'Continue' || rec.suggestedAction === 'Reschedule') && (
                    <button
                      onClick={() => {
                        void handleAction(rec);
                      }}
                      disabled={isApplyingAction === `${rec.id}-${rec.suggestedAction || 'action'}`}
                      className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-white dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition-all flex items-center gap-2"
                    >
                      {isApplyingAction === `${rec.id}-${rec.suggestedAction || 'action'}` && <Loader2 size={14} className="animate-spin" />}
                      {rec.suggestedAction}
                      <ArrowRight size={14} className="text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!showAllRecs && recommendations.length > 5 && (
              <button
                onClick={() => setShowAllRecs(true)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline py-2 text-center"
              >
                Show all {recommendations.length} recommendations
              </button>
            )}
          </div>
        )}

        {/* Bottlenecks Section */}
        <div ref={bottlenecksRef} className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
          <BottleneckAlert tasks={tasks} users={users} currentUser={currentUser} projectId={projectId} />
        </div>
      </div>

      {/* Reschedule Modal */}
      <Modal isOpen={rescheduleData.isOpen} onClose={() => setRescheduleData({ isOpen: false, task: null, days: '1' })} title="Reschedule Task">
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            How many days would you like to delay &quot;{rescheduleData.task?.title}&quot;?
          </p>
          <input
            type="number"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={rescheduleData.days}
            onChange={(e) => setRescheduleData(prev => ({ ...prev, days: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void submitReschedule();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRescheduleData({ isOpen: false, task: null, days: '1' })}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                void submitReschedule();
              }}
              disabled={isApplyingAction === `reschedule-${rescheduleData.task?.id}`}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              {isApplyingAction === `reschedule-${rescheduleData.task?.id}` ? 'Updating...' : 'Confirm Update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
