"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "./Icon";

interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface InteractiveToast {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id"> | string) => void;
  showInteractiveToast: (toast: Omit<InteractiveToast, "id">) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [interactiveToasts, setInteractiveToasts] = useState<InteractiveToast[]>([]);

  const showToast = (toast: Omit<Toast, "id"> | string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = typeof toast === 'string' 
      ? { message: toast, id, type: "info" as const }
      : { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-hide after duration (default 3 seconds)
    const duration = typeof toast === 'string' ? 3000 : (toast.duration || 3000);
    setTimeout(() => {
      hideToast(id);
    }, duration);
  };

  const showInteractiveToast = (toast: Omit<InteractiveToast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setInteractiveToasts(prev => [...prev, newToast]);

    // Auto-hide after duration (default 5 seconds for interactive toasts)
    const duration = toast.duration || 5000;
    setTimeout(() => {
      hideToast(id);
    }, duration);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    setInteractiveToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastStyles = (type: Toast["type"] = "info") => {
    switch (type) {
      case "success":
        return "bg-green-500/90 border-green-400/50";
      case "error":
        return "bg-red-500/90 border-red-400/50";
      case "warning":
        return "bg-yellow-500/90 border-yellow-400/50";
      default:
        return "bg-black/90 border-white/20";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showInteractiveToast, hideToast }}>
      {children}
      
      {/* Toast Container - Positioned at top */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none">
        <div className="flex flex-col gap-2 max-w-md mx-4">
          {/* Regular Toasts */}
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto"
              >
                <div className={`${getToastStyles(toast.type)} text-white px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{toast.message}</p>
                    <button
                      onClick={() => hideToast(toast.id)}
                      className="text-white/70 hover:text-white transition-colors ml-2"
                      aria-label="Close notification"
                    >
                      <Icon name="x" size="sm" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Interactive Toasts */}
          <AnimatePresence>
            {interactiveToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto"
              >
                <div className={`${getToastStyles(toast.type)} text-white px-4 py-4 rounded-xl shadow-2xl border backdrop-blur-sm`}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-medium text-sm pr-8">{toast.message}</p>
                    <button
                      onClick={() => hideToast(toast.id)}
                      className="text-white/70 hover:text-white transition-colors"
                      aria-label="Close notification"
                    >
                      <Icon name="x" size="sm" />
                    </button>
                  </div>
                  {toast.action && (
                    <button
                      onClick={toast.action.onClick}
                      className="w-full bg-white text-[#0052ff] py-2.5 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
};
