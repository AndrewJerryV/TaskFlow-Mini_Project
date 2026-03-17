'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Task, User } from '@/types';
import { AlertCircle, Brain, Coffee, Heart, Sparkles, TrendingDown, Check, Loader2, UserPlus, ArrowRightLeft, Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useAuth } from '@/contexts/AuthContext';

interface WellnessAlertsProps {
  tasks: Task[];
  users: User[];
}

interface SwapOption {
  backupUser: User;
  backupTask: Task;
  burnoutTask: Task;
  skillScore: number;
  matchingSkills: string[];
}

export function WellnessAlerts({ tasks, users }: WellnessAlertsProps) {
  const { currentUser } = useAuth();
  const canRebalance = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
  const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
  const [reassigningUser, setReassigningUser] = useState<User | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [swapOptions, setSwapOptions] = useState<SwapOption[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSuggestBreak = async (user: User) => {
    setIsSuggesting(user.id);
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'wellness',
          title: 'Time for a recharge! ☕',
          message: 'Your manager suggests taking a short break to stay at your best. You\'ve been working hard!',
        })
      });
      setTimeout(() => setIsSuggesting(null), 2000);
    } catch (error) {
      console.error('Failed to suggest break:', error);
      setIsSuggesting(null);
    }
  };

  const discoverSwapOptions = useCallback(async (burnoutUser: User) => {
    setIsAiLoading(true);
    setSwapOptions([]);
    setActionError(null);

    // Get burned-out user's high-priority tasks
    const burnoutTasks = tasks.filter(
      t => t.assigneeId === burnoutUser.id && t.status !== 'Done' &&
      (t.priority === 'Critical' || t.priority === 'High')
    );
    setPendingTasks(burnoutTasks);

    if (burnoutTasks.length === 0) {
      setIsAiLoading(false);
      return;
    }

    try {
      // Run Smart Assign for each high-priority task to get skill-matched candidates
      const allOptions: SwapOption[] = [];

      for (const burnoutTask of burnoutTasks) {
        const res = await fetch('/api/ai/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: burnoutTask.title,
            description: burnoutTask.description,
            priority: burnoutTask.priority,
            projectId: burnoutTask.projectId
          })
        });

        if (!res.ok) {
          throw new Error('Unable to load AI assignment candidates right now.');
        }

        const data = await res.json();
        const candidates = (data.allCandidates || []).filter(
          (c: any) => c.id !== burnoutUser.id && c.score > 50
        );

        for (const candidate of candidates.slice(0, 3)) {
          // Find a low-priority task from this candidate that can be swapped
          const candidateLowTasks = tasks.filter(
            t => t.assigneeId === candidate.id && t.status !== 'Done' &&
            (t.priority === 'Low' || t.priority === 'Medium')
          );

          const backupUser = users.find(u => u.id === candidate.id);
          if (!backupUser) continue;

          if (candidateLowTasks.length > 0) {
            // Swap option: trade tasks
            allOptions.push({
              backupUser,
              backupTask: candidateLowTasks[0],
              burnoutTask,
              skillScore: candidate.score,
              matchingSkills: candidate.matchingSkills || []
            });
          } else {
            // Reassign-only option (no swappable low-priority task)
            allOptions.push({
              backupUser,
              backupTask: null as any, // No task to swap
              burnoutTask,
              skillScore: candidate.score,
              matchingSkills: candidate.matchingSkills || []
            });
          }
        }
      }

      setSwapOptions(allOptions);
    } catch (error) {
      console.error('AI Swap discovery failed:', error);
      setActionError(error instanceof Error ? error.message : 'AI swap discovery failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  }, [tasks, users]);

  const handleStartReassign = (user: User) => {
    if (!canRebalance) {
      setActionError('Only Admins and Managers can rebalance workload.');
      return;
    }
    setReassigningUser(user);
    discoverSwapOptions(user);
  };

  const patchTaskAssignee = async (taskId: string, assigneeId: string | null) => {
    if (!currentUser?.id) {
      throw new Error('You must be signed in to rebalance tasks.');
    }

    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        userId: currentUser.id,
        assigneeId
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = typeof errorBody?.error === 'string' ? errorBody.error : 'Task update failed';
      throw new Error(message);
    }
  };

  const handleExecuteSwap = async (option: SwapOption) => {
    if (!reassigningUser) return;
    const key = `${option.backupUser.id}-${option.burnoutTask.id}`;
    setIsFinalizing(key);
    setActionError(null);
    try {
      // 1. Move critical task to backup user
      await patchTaskAssignee(option.burnoutTask.id, option.backupUser.id);

      // 2. Move low-priority task to burned-out user
      if (option.backupTask) {
        await patchTaskAssignee(option.backupTask.id, reassigningUser.id);
      }

      // 3. Notifications
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: reassigningUser.id,
          type: 'task',
          title: option.backupTask ? 'Workload Swapped 🔄' : 'Task Reassigned',
          message: option.backupTask
            ? `Your task "${option.burnoutTask.title}" was swapped for "${option.backupTask.title}" to balance workload.`
            : `Your task "${option.burnoutTask.title}" has been reassigned to ${option.backupUser.name} to balance workload.`
        })
      });

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: option.backupUser.id,
          type: 'task',
          title: option.backupTask ? 'Task Swap Assigned' : 'New Task Assigned (Rebalance)',
          message: option.backupTask
            ? `You've taken on "${option.burnoutTask.title}" in exchange for "${option.backupTask.title}" to support your teammate.`
            : `You have been assigned "${option.burnoutTask.title}" to help balance the team workload.`
        })
      });

      setReassigningUser(null);
      window.location.reload();
    } catch (error) {
      console.error('Swap failed', error);
      setActionError(error instanceof Error ? error.message : 'Failed to complete workload rebalance.');
    } finally {
      setIsFinalizing(null);
    }
  };

  const handleMoveToPending = async (task: Task) => {
    if (!reassigningUser) return;
    setIsFinalizing(`pending-${task.id}`);
    setActionError(null);
    try {
      await patchTaskAssignee(task.id, null);

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: reassigningUser.id,
          type: 'task',
          title: 'Task Moved to Pending',
          message: `Your task "${task.title}" has been moved to the backlog to reduce your current workload.`,
          entityId: task.id
        })
      });

      setReassigningUser(null);
      window.location.reload();
    } catch (error) {
      console.error('Move to pending failed', error);
      setActionError(error instanceof Error ? error.message : 'Failed to move task to pending.');
    } finally {
      setIsFinalizing(null);
    }
  };

  // Analyze burnout risk
  const burnoutRisks = users.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id);
    const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
    const critical = userTasks.filter(t => t.priority === 'Critical' && t.status !== 'Done').length;
    const overdue = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
    let riskScore = (inProgress * 15) + (critical * 20) + (overdue * 25);
    riskScore = Math.min(riskScore, 100);
    return {
      user,
      riskScore,
      reasons: [
        inProgress > 3 ? `${inProgress} active tasks` : null,
        critical > 1 ? `${critical} critical blockers` : null,
        overdue > 0 ? `${overdue} overdue items` : null,
      ].filter(Boolean) as string[]
    };
  }).filter(risk => risk.riskScore > 60).sort((a, b) => b.riskScore - a.riskScore);

  if (burnoutRisks.length === 0) return null;

  // Group swap options by burnout task for the modal
  const groupedByTask = pendingTasks.map(task => ({
    task,
    options: swapOptions.filter(o => o.burnoutTask.id === task.id)
  }));

    return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-rose-100 dark:border-rose-900/30 overflow-hidden shadow-sm">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full bg-rose-50 dark:bg-rose-900/20 p-4 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <Brain size={18} />
            <h3 className="text-sm tracking-tight flex items-center gap-1.5 font-semibold">
              AI Wellness Insights
              <span className="bg-rose-200 dark:bg-rose-800 text-[10px] px-1.5 py-0.5 rounded-full uppercase">Beta</span>
            </h3>
          </div>
          <div className="flex items-center gap-3">
             {isCollapsed && burnoutRisks.length > 0 && (
                <span className="text-[10px] bg-rose-200/50 dark:bg-rose-800/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1 font-medium">
                  {burnoutRisks.length} Risk{burnoutRisks.length > 1 ? 's' : ''}
                </span>
             )}
             {isCollapsed ? <ChevronDown size={16} className="text-rose-400" /> : <ChevronUp size={16} className="text-rose-400" />}
          </div>
        </button>
        
        {!isCollapsed && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
        {burnoutRisks.map(({ user, riskScore, reasons }) => (
          <div key={user.id} className="flex flex-col gap-3 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all hover:border-rose-200 dark:hover:border-rose-800 group">
            <div className="flex items-start justify-between">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-rose-200 dark:border-rose-800">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-500">{user.name.charAt(0)}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-1 border-2 border-white dark:border-gray-800 shadow-sm">
                  <AlertCircle size={10} />
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <TrendingDown size={12} className="text-rose-500" />
                  <span className="text-xs text-rose-600 dark:text-rose-400">{riskScore}%</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Risk Score</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-gray-900 dark:text-white text-sm mb-2 truncate">{user.name}</h4>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                {reasons.map(reason => (
                  <span key={reason} className="text-[10px] px-2 py-0.5 bg-white dark:bg-gray-700 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 rounded-md font-medium shadow-sm">
                    {reason}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                <button 
                  onClick={() => handleSuggestBreak(user)}
                  disabled={isSuggesting === user.id}
                  className={`flex items-center gap-1.5 text-[11px] ${isSuggesting === user.id ? 'text-green-500' : 'text-blue-600 dark:text-blue-400'}`}
                >
                  {isSuggesting === user.id ? <Check size={12} /> : <Coffee size={12} />}
                  {isSuggesting === user.id ? 'Sent!' : 'Suggest Break'}
                </button>
                <button 
                  onClick={() => handleStartReassign(user)}
                  disabled={!canRebalance}
                  className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400"
                >
                  <Heart size={12} /> Reassign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>

    {/* AI Swap Modal */}
    <Modal 
      isOpen={!!reassigningUser} 
      onClose={() => !isFinalizing && setReassigningUser(null)}
      title={`AI Workload Rebalance: ${reassigningUser?.name}`}
    >
      <div className="p-4">
        {actionError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {actionError}
          </div>
        )}
        {isAiLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={28} className="text-violet-500 animate-spin" />
            <p className="text-sm text-gray-400 animate-pulse">AI is analyzing team skills, capacity & tasks...</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600">Finding optimal swap pairs for workload balance</p>
          </div>
        ) : groupedByTask.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles size={24} className="text-green-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No high-priority tasks found for {reassigningUser?.name}.</p>
            <p className="text-xs text-gray-400 mt-1">Their workload may already be manageable.</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
            {groupedByTask.map(({ task, options }) => (
              <div key={task.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Burnout Task Header */}
                <div className="bg-rose-50 dark:bg-rose-900/15 p-3 border-b border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${task.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>{task.priority}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{task.title}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{task.status} • {reassigningUser?.name}&apos;s task</p>
                </div>

                {/* Swap Options - 2 Column Table */}
                {options.length > 0 ? (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {/* Table Header */}
                    <div className="grid grid-cols-2 gap-0 text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="p-2 pl-3">Team Member</div>
                      <div className="p-2 pl-3 border-l border-gray-100 dark:border-gray-700">Their Swappable Task</div>
                    </div>

                    {/* Table Rows */}
                    {options.map((option, idx) => {
                      const key = `${option.backupUser.id}-${option.burnoutTask.id}`;
                      const isProcessing = isFinalizing === key;
                      return (
                        <div key={idx} className="grid grid-cols-2 gap-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/5 transition-colors group">
                          {/* Column 1: Team Member */}
                          <div className="p-3 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-300 text-xs flex-shrink-0">
                              {option.backupUser.avatarUrl ? (
                                <img src={option.backupUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : option.backupUser.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-gray-900 dark:text-white truncate">{option.backupUser.name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1 rounded">{option.skillScore}% match</span>
                                <span className="text-[9px] text-gray-400 truncate">{option.matchingSkills.slice(0, 2).join(', ')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Their Swappable Task + Action */}
                          <div className="p-3 border-l border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            {option.backupTask ? (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-700 dark:text-gray-300 truncate">{option.backupTask.title}</div>
                                  <span className={`text-[9px] ${option.backupTask.priority === 'Low' ? 'text-blue-500' : 'text-yellow-600'}`}>{option.backupTask.priority}</span>
                                </div>
                                <button
                                  disabled={!!isFinalizing || !canRebalance}
                                  onClick={() => handleExecuteSwap(option)}
                                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-[10px] hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-50"
                                >
                                  {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightLeft size={12} />}
                                  Swap
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] text-gray-400 italic">No low-priority tasks</div>
                                </div>
                                <button
                                  disabled={!!isFinalizing || !canRebalance}
                                  onClick={() => handleExecuteSwap(option)}
                                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                                >
                                  {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                                  Assign
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs text-orange-500 font-medium">No skill-matched teammates found for this task.</p>
                  </div>
                )}

                {/* Move to Pending - Always Visible per task */}
                <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700">
                  <button
                    disabled={!!isFinalizing || !canRebalance}
                    onClick={() => handleMoveToPending(task)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-400 dark:text-gray-500 hover:border-rose-300 hover:text-rose-500 dark:hover:border-rose-700 dark:hover:text-rose-400 transition-all text-xs disabled:opacity-50"
                  >
                    {isFinalizing === `pending-${task.id}` ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />}
                    Move to Pending (Unassign)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
    </>
  );
}
