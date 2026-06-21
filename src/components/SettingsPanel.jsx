'use client';
import { motion, AnimatePresence } from 'framer-motion';
import useProjectStore from '@/store/useProjectStore';

export default function SettingsPanel() {
  const showSettings = useProjectStore((s) => s.showSettings);
  const setShowSettings = useProjectStore((s) => s.setShowSettings);
  const isDarkMode = useProjectStore((s) => s.isDarkMode);
  const setIsDarkMode = useProjectStore((s) => s.setIsDarkMode);
  const isStreamerMode = useProjectStore((s) => s.isStreamerMode);
  const setIsStreamerMode = useProjectStore((s) => s.setIsStreamerMode);

  return (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSettings(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                aria-label="Close settings"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <label className="flex items-center justify-between py-3 cursor-pointer group">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Dark mode</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Switch between light and dark themes</p>
                </div>
                <button
                  role="switch"
                  aria-checked={isDarkMode}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                    isDarkMode ? 'bg-[var(--accent-clay)]' : 'bg-[var(--border-subtle)]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      isDarkMode ? 'translate-x-[1.375rem]' : 'translate-x-1'
                    }`}
                    style={{ marginTop: '4px' }}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between py-3 cursor-pointer group">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Streamer mode</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Hide sensitive content from view</p>
                </div>
                <button
                  role="switch"
                  aria-checked={isStreamerMode}
                  onClick={() => setIsStreamerMode(!isStreamerMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                    isStreamerMode ? 'bg-[var(--accent-clay)]' : 'bg-[var(--border-subtle)]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      isStreamerMode ? 'translate-x-[1.375rem]' : 'translate-x-1'
                    }`}
                    style={{ marginTop: '4px' }}
                  />
                </button>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
              <p className="text-xs text-[var(--text-muted)]">Projectory v1.0</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
