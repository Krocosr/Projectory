'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

let toastIdCounter = 0;

// Maximum number of toasts visible at once
const MAX_VISIBLE_TOASTS = 3;

// Toast auto-dismiss duration in milliseconds
const TOAST_DURATION = 3000;

/**
 * Toast notification hook with queue management
 * 
 * Features:
 * - Automatic queue management (max 3 visible toasts)
 * - Manual dismiss functionality
 * - Auto-dismiss after 3 seconds
 * - Prevents toast overlap with stacking
 * 
 * @returns {Object} { toasts, addToast, dismissToast }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timeoutRefs = useRef({});

  const dismissToast = useCallback((id) => {
    // Clear timeout if exists
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdCounter;
    
    setToasts((prev) => {
      // If we're at max capacity, remove the oldest toast
      const updated = prev.length >= MAX_VISIBLE_TOASTS 
        ? prev.slice(1) 
        : prev;
      
      return [...updated, { id, message, type }];
    });
    
    // Set auto-dismiss timeout
    timeoutRefs.current[id] = setTimeout(() => {
      dismissToast(id);
    }, TOAST_DURATION);
  }, [dismissToast]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  return { toasts, addToast, dismissToast };
}

const ICONS = {
  success: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
    </svg>
  ),
};

const TYPE_STYLES = {
  success: 'bg-[#5A8F6C] text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-[var(--accent-slate)] text-white',
};

/**
 * Toast notification container component
 * 
 * Displays toast notifications with animations and dismiss buttons.
 * Toasts are stacked vertically and limited to MAX_VISIBLE_TOASTS.
 * 
 * @param {Array} toasts - Array of toast objects { id, message, type }
 * @param {Function} onDismiss - Callback to dismiss a toast by id
 */
export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${TYPE_STYLES[toast.type] || TYPE_STYLES.success}`}
            role="alert"
          >
            {ICONS[toast.type] || ICONS.success}
            <span>{toast.message}</span>
            {onDismiss && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="ml-1 hover:opacity-70 transition-opacity"
                aria-label="Dismiss notification"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
