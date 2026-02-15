'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Task, User } from '@/types';
import { Sparkles, ArrowRight, BrainCircuit, TrendingUp, Calendar, AlertCircle, ArrowDown } from 'lucide-react';
import { BottleneckAlert } from '@/components/BottleneckAlert';

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
  score: number; // 0-100 relevance score
  reason: string;
  suggestedAction?: string;
}

export default function MLTaskRecommendations({ tasks, projectId, users, currentUser, onTaskUpdate }: MLTaskRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const bottlenecksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateRecommendations = () => {
      setLoading(true);
      const generated: Recommendation[] = [];
      const now = new Date();

      // Helper to calculate days difference
      const getDaysDiff = (dateStr: string) => {
        const d = new Date(dateStr);
        return Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      };

      const getDueInDays = (dateStr?: string) => {
        if (!dateStr) return 999;
        const d = new Date(dateStr);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
      };

      tasks.forEach(task => {
        let score = 0;
        let reasons: string[] = [];
        let type: Recommendation['type'] | null = null;
        let suggestedAction = 'View Details';

        // 1. Scoring Logic

        // Priority Weight
        if (task.priority === 'Critical') { score += 40; reasons.push('Critical priority'); }
        else if (task.priority === 'High') { score += 25; reasons.push('High priority'); }

        // Due Date Weight
        const dueIn = getDueInDays(task.dueDate);
        if (task.dueDate) {
          if (dueIn < 0) { score += 50; reasons.push(`Overdue by ${Math.abs(dueIn)} days`); }
          else if (dueIn === 0) { score += 40; reasons.push('Due today'); }
          else if (dueIn <= 2) { score += 25; reasons.push(`Due in ${dueIn} days`); }
        }

        // Assignee Weight
        const isAssignedToMe = task.assigneeId === currentUser?.id;
        if (isAssignedToMe) { score += 20; }

        // Stagnation Weight (for In Progress)
        const daysSinceUpdate = getDaysDiff(task.updatedAt);
        if (task.status === 'In Progress' && daysSinceUpdate > 3) {
          score += 15 + daysSinceUpdate; // Higher score the longer it's stale
          reasons.push(`No updates for ${daysSinceUpdate} days`);
        }

        // 2. Classification Logic

        // Type: Overdue Risk
        if (task.status !== 'Done' && task.dueDate && dueIn <= 1) {
          type = 'overdue_risk';
          suggestedAction = dueIn < 0 ? 'Reschedule' : 'Prioritize';
        }

        // Type: Bottleneck (Stale In Progress)
        else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
          type = 'bottleneck';
          suggestedAction = isAssignedToMe ? 'Update Status' : 'Follow Up';
        }

        // Type: Focus (High Score + Assigned to Me)
        else if (isAssignedToMe && score > 60 && task.status !== 'Done') {
          type = 'focus';
          suggestedAction = task.status === 'To Do' ? 'Start Task' : 'Continue';
        }

        // Type: Quick Win (Low Priority, To Do, No meaningful description or short)
        else if (task.status === 'To Do' && task.priority === 'Low' && (!task.dueDate || dueIn > 7)) {
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
            score: Math.min(score, 100), // Cap at 100
            reason: reasons.join(' • '),
            suggestedAction
          });
        }
      });

      // Sort by score descending and take top 6
      setRecommendations(generated.sort((a, b) => b.score - a.score).slice(0, 6));
      setLoading(false);
    };

    generateRecommendations();
  }, [tasks, currentUser]);

  const handleAction = (rec: Recommendation) => {
    if (!onTaskUpdate) return;
    const task = tasks.find(t => t.id === rec.taskId);
    if (!task) return;

    if (rec.suggestedAction === 'Complete Now') {
      const confirmed = window.confirm(`Mark "${task.title}" as Done?`);
      if (confirmed) onTaskUpdate({ ...task, status: 'Done' });
    } else if (rec.suggestedAction === 'Start Task') {
      onTaskUpdate({ ...task, status: 'In Progress' });
    } else {
      // For other actions, simply alert for now or navigation if specific routing was enabled
      alert(`Action: ${rec.suggestedAction}\nTask: ${task.title}`);
    }
  };

  const scrollToBottlenecks = () => {
    bottlenecksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500 text-sm">Generating insights...</div>;
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
          <span className="text-xs text-gray-500 dark:text-gray-400">AI-driven prioritization</span>
        </div>

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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{rec.reason}</p>
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
    </div>
  );
}
