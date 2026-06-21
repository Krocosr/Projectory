'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import useProjectStore from '@/store/useProjectStore';

const SIDEBAR_OPEN = 260;
const SIDEBAR_CLOSED = 56;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'projects', label: 'Projects', icon: 'projects' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'about', label: 'About', icon: 'info' },
];

function Icon({ name, className = 'w-5 h-5', strokeWidth = 2 }) {
  const paths = {
    dashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    ),
    projects: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    ),
    chart: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
    info: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    ),
    settings: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    ),
    collapse: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    ),
    expand: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    ),
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
      {paths[name]}
    </svg>
  );
}

function AboutDialog({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="About Projectory"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">About Projectory</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Version</p>
            <p className="text-sm text-[var(--text-primary)] mt-1 font-medium">0.11.3</p>
          </div>

          <div className="space-y-3">
            <a
              href="https://github.com/Krocosr/Projectory"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub Repository
            </a>
            <a
              href="https://github.com/Krocosr/Projectory/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              Report an Issue
            </a>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {['Next.js', 'React', 'Tailwind CSS', 'Zustand', 'Dexie.js', 'Framer Motion', '@dnd-kit', '@hello-pangea/dnd'].map((tech) => (
                <span key={tech} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-[var(--text-muted)] space-y-1 leading-relaxed">
            <p>Built with care for local-first project management.</p>
            <p>Licensed under the MIT License.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isLeftSidebarOpen = useProjectStore((s) => s.isLeftSidebarOpen);
  const setIsLeftSidebarOpen = useProjectStore((s) => s.setIsLeftSidebarOpen);
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const setShowSettings = useProjectStore((s) => s.setShowSettings);
  const isDarkMode = useProjectStore((s) => s.isDarkMode);
  const [showAbout, setShowAbout] = useState(false);
  const [notification, setNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  const hasProject = !!selectedProject;

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const showNotification = useCallback((message) => {
    setNotification(message);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => setNotification(null), 2500);
  }, []);

  const handleNav = useCallback((id) => {
    switch (id) {
      case 'dashboard':
      case 'projects':
        router.push('/', { scroll: false });
        break;
      case 'insights':
        showNotification('Insights — coming soon');
        break;
      case 'about':
        setShowAbout(true);
        break;
      case 'settings':
        setShowSettings(true);
        break;
    }
  }, [router, showNotification, setShowSettings]);

  const handleSettings = useCallback(() => {
    setShowSettings(true);
  }, [setShowSettings]);

  const toggle = useCallback(() => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  }, [isLeftSidebarOpen, setIsLeftSidebarOpen]);

  const goHome = useCallback(() => {
    router.push('/', { scroll: false });
    if (!isLeftSidebarOpen) {
      setIsLeftSidebarOpen(true);
    }
  }, [router, isLeftSidebarOpen, setIsLeftSidebarOpen]);

  const isActive = (id) => {
    if (id === 'dashboard') return !hasProject && pathname === '/';
    if (id === 'projects') return hasProject && pathname === '/';
    return false;
  };

  return (
    <motion.aside
      animate={{ width: isLeftSidebarOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED }}
      transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
      className="shrink-0 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      {!isLeftSidebarOpen ? (
        <>
          <div className="flex items-center justify-center h-14 shrink-0 border-b border-[var(--border-subtle)]">
            <button onClick={goHome} className="cursor-pointer" aria-label="Home">
              <img
                src={isDarkMode ? '/exports/icon-monochrome-transparent.svg' : '/exports/icon-transparent.svg'}
                alt=""
                className="shrink-0 w-7 h-7"
              />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
              aria-label="Expand sidebar"
            >
              <Icon name="expand" className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border-subtle)] shrink-0">
            <button onClick={goHome} className="flex items-center gap-3 cursor-pointer">
              <img
                src={isDarkMode ? '/exports/icon-monochrome-transparent.svg' : '/exports/icon-transparent.svg'}
                alt=""
                className="shrink-0 w-7 h-7"
              />
              <img src="/exports/wordmark.svg" alt="Projectory" className="h-4 mt-0.5" />
            </button>
            <button
              onClick={toggle}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <Icon name="collapse" className="w-3.5 h-3.5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1 mt-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                  isActive(item.id)
                    ? 'bg-[var(--accent-clay)]/12 text-[var(--accent-clay)] font-semibold shadow-[inset_3px_0_0_0_var(--accent-clay)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] font-medium'
                }`}
              >
                <Icon name={item.icon} className="shrink-0 w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <AnimatePresence>
            {notification && (
              <motion.div
                key="notification"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-2 mx-3 mb-2 text-xs font-medium text-[var(--accent-clay)] bg-[var(--accent-clay)]/8 rounded-lg"
              >
                {notification}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 shrink-0">
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-all duration-150 font-medium"
            >
              <Icon name="settings" className="shrink-0 w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
        </>
      )}

      <AnimatePresence>
        {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </motion.aside>
  );
}
