'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: AlertType;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  resolve: (value: boolean) => void;
}

interface PromptState {
  isOpen: boolean;
  message: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
  showConfirm: (message: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const showAlert = useCallback((message: string, type: AlertType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ isOpen: true, message, resolve });
    });
  }, []);

  const handleConfirmResponse = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const showPrompt = useCallback((message: string, defaultValue: string = '') => {
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setPromptState({ isOpen: true, message, defaultValue, resolve });
    });
  }, []);

  const handlePromptResponse = (submit: boolean) => {
    if (promptState) {
      promptState.resolve(submit ? promptValue : null);
      setPromptState(null);
    }
  };

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-6 h-6 text-brand-green" />;
      case 'error': return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'info': return <Info className="w-6 h-6 text-brand-blue" />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/90 dark:bg-brand-dark/90 backdrop-blur-md border border-white/20 dark:border-gray-800 shadow-[0_0_15px_rgba(108,60,252,0.15)] text-gray-900 dark:text-white"
            >
              {getIcon(toast.type)}
              <span className="font-medium mr-2">{toast.message}</span>
              <button
                onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
                className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-[0_0_20px_rgba(23,117,212,0.15)] border border-gray-100 dark:border-gray-700 p-6"
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-brand-blue" />
                Confirm Action
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmState.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleConfirmResponse(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmResponse(true)}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-brand-blue hover:bg-blue-600 shadow-lg shadow-brand-blue/30 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {promptState && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-[0_0_20px_rgba(129,199,115,0.15)] border border-gray-100 dark:border-gray-700 p-6"
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="w-6 h-6 text-brand-green" />
                Input Required
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{promptState.message}</p>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePromptResponse(true);
                  if (e.key === 'Escape') handlePromptResponse(false);
                }}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-green outline-none transition-all mb-6 text-gray-900 dark:text-white"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handlePromptResponse(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePromptResponse(true)}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-brand-green hover:bg-green-600 shadow-lg shadow-brand-green/30 transition-colors"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
};
