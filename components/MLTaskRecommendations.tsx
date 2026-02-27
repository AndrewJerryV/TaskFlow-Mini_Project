'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Task, User } from '@/types';
import { Sparkles, ArrowRight, BrainCircuit, TrendingUp, Calendar, AlertCircle, ArrowDown, Loader2, Zap, Lightbulb } from 'lucide-react';
import { BottleneckAlert } from '@/components/BottleneckAlert';
import { Modal } from '@/components/ui/Modal';

interface MLTaskRecommendationsProps {
  tasks: Task[];
  projectId: string;
  users: User[];
  currentUser: User | null;
  onTaskUpdate?: (task: Task) => void;
}

interface Recommendation {
  id: string;
  taskId?: string;
  type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk';
  title: string;
  description: string;
  score: number;
  reason: string;
  suggestedAction?: string;
}

export default function MLTaskRecommendations({ tasks, projectId, users, currentUser, onTaskUpdate }: MLTaskRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mlPowered, setMlPowered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState<{ isOpen: boolean, task: Task | null, days: string }>({ isOpen: false, task: null, days: '1' });
  const bottlenecksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ projectId });
        if (currentUser?.id) params.set('userId', currentUser.id);

        const res = await fetch(`/api/ml/recommendations?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch recommendations');

        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setMlPowered(data.mlPowered || false);
      } catch (err) {
        console.error('Failed to fetch ML recommendations:', err);
        setError('Failed to load recommendations');
        // Fallback: generate client-side (original logic)
        generateFallbackRecommendations();
      } finally {
        setLoading(false);
      }
    };

    // Client-side fallback (original heuristic logic)
    const generateFallbackRecommendations = () => {
      const generated: Recommendation[] = [];
      const now = new Date();

      const getDueInDays = (dateStr?: string) => {
        if (!dateStr) return 999;
        const d = new Date(dateStr);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
      };

      tasks.forEach(task => {
        if (task.status === 'Done') return;

        let score = 0;
        let reasons: string[] = [];
        let type: Recommendation['type'] | null = null;
        let suggestedAction = 'View Details';

        if (task.priority === 'Critical') { score += 40; reasons.push('Critical priority'); }
        else if (task.priority === 'High') { score += 25; reasons.push('High priority'); }

        const dueIn = getDueInDays(task.dueDate);
        if (task.dueDate) {
          if (dueIn < 0) { score += 50; reasons.push(`Overdue by ${Math.abs(dueIn)} days`); }
          else if (dueIn === 0) { score += 40; reasons.push('Due today'); }
          else if (dueIn <= 2) { score += 25; reasons.push(`Due in ${dueIn} days`); }
        }

        const isAssignedToMe = task.assigneeId === currentUser?.id;
        if (isAssignedToMe) { score += 20; }

        const daysSinceUpdate = Math.floor((now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 3600 * 24));
        if (task.status === 'In Progress' && daysSinceUpdate > 3) {
          score += 15 + daysSinceUpdate;
          reasons.push(`No updates for ${daysSinceUpdate} days`);
        }

        if (task.dueDate && dueIn <= 1) {
          type = 'overdue_risk';
          suggestedAction = dueIn < 0 ? 'Reschedule' : 'Prioritize';
        } else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
          type = 'bottleneck';
          suggestedAction = isAssignedToMe ? 'Update Status' : 'Follow Up';
        } else if (isAssignedToMe && score > 60) {
          type = 'focus';
          suggestedAction = task.status === 'To Do' ? 'Start Task' : 'Continue';
        } else if (task.status === 'To Do' && task.priority === 'Low' && (!task.dueDate || dueIn > 7)) {
          type = 'quick_win';
          score = 40;
          reasons = ['Low effort estimate', 'Clear backlog'];
          suggestedAction = 'Complete Now';
        }

        if (type && score > 30) {
          generated.push({
            id: `rec-${task.id}`,
            taskId: task.id,
            type,
            title: task.title,
            description: task.description || 'No description provided',
            score: Math.min(score, 100),
            reason: reasons.join(' • '),
            suggestedAction
          });
        }
      });

      setRecommendations(generated.sort((a, b) => b.score - a.score).slice(0, 6));
      setMlPowered(false);
    };

    fetchRecommendations();
  }, [tasks, currentUser, projectId]);

  const handleAction = (rec: Recommendation) => {
    if (!onTaskUpdate) return;
    const task = tasks.find(t => t.id === rec.taskId);
    if (!task) return;

    if (rec.suggestedAction === 'Complete Now') {
      const confirmed = window.confirm(`Mark "${task.title}" as Done?`);
      if (confirmed) onTaskUpdate({ ...task, status: 'Done' });
    } else if (rec.suggestedAction === 'Start Task') {
      onTaskUpdate({ ...task, status: 'In Progress' });
    } else if (rec.suggestedAction === 'Reschedule') {
      setRescheduleData({ isOpen: true, task, days: '1' });
    } else {
      alert(`Action: ${rec.suggestedAction}\nTask: ${task.title}`);
    }
  };

  const scrollToBottlenecks = () => {
    bottlenecksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
        <span>Analyzing your project with AI...</span>
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
          <div className="flex items-center gap-2">
            {mlPowered && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                <Zap size={10} />
                ML Insights
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {mlPowered ? 'Powered by Local ML' : 'Heuristic analysis'}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            {error} — showing fallback recommendations.
          </div>
        )}

        {recommendations.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-900 dark:text-white font-medium">No immediate recommendations</h3>
            <p className="text-gray-500 text-sm mt-1">Your project execution is on track.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recommendations.map(rec => (
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${rec.type === 'focus' ? 'text-blue-700 dark:text-blue-300' :
                        rec.type === 'bottleneck' ? 'text-orange-700 dark:text-orange-300' :
                          rec.type === 'overdue_risk' ? 'text-red-700 dark:text-red-300' :
                            'text-green-700 dark:text-green-300'
                        }`}>
                        {rec.type.replace('_', ' ')}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs text-gray-500 font-medium">Match: {rec.score}%</span>
                    </div>

                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-4">{rec.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{rec.reason}</p>
                    {mlPowered && rec.description && rec.description !== 'No description provided' && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 italic line-clamp-2 flex items-start gap-1">
                        <Lightbulb size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{rec.description}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 pl-4 border-l border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleAction(rec)}
                    className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-white dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition-all flex items-center gap-2"
                  >
                    {rec.suggestedAction}
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottlenecks Section */}
      <div ref={bottlenecksRef}>
        <BottleneckAlert tasks={tasks} users={users} />
      </div>

      {/* Reschedule Modal */}
      <Modal isOpen={rescheduleData.isOpen} onClose={() => setRescheduleData({ isOpen: false, task: null, days: '1' })} title="Reschedule Task">
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            How many days would you like to delay "{rescheduleData.task?.title}"?
          </p>
          <input
            type="number"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={rescheduleData.days}
            onChange={(e) => setRescheduleData(prev => ({ ...prev, days: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const days = parseInt(rescheduleData.days);
                if (!isNaN(days) && rescheduleData.task) {
                  const newDate = rescheduleData.task.dueDate ? new Date(rescheduleData.task.dueDate) : new Date();
                  newDate.setDate(newDate.getDate() + days);
                  onTaskUpdate?.({ ...rescheduleData.task, dueDate: newDate.toISOString() });
                  setRescheduleData({ isOpen: false, task: null, days: '1' });
                }
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
                const days = parseInt(rescheduleData.days);
                if (!isNaN(days) && rescheduleData.task) {
                  const newDate = rescheduleData.task.dueDate ? new Date(rescheduleData.task.dueDate) : new Date();
                  newDate.setDate(newDate.getDate() + days);
                  onTaskUpdate?.({ ...rescheduleData.task, dueDate: newDate.toISOString() });
                  setRescheduleData({ isOpen: false, task: null, days: '1' });
                }
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              Confirm Update
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
