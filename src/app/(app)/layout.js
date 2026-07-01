'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useProjectStore from '@/store/useProjectStore';
import LeftSidebar from '@/components/LeftSidebar';
import ActiveTodosSidebar from '@/components/ActiveTodosSidebar';
import MobileNavBar from '@/components/MobileNavBar';
import MobileNavDrawer from '@/components/MobileNavDrawer';
import SettingsPanel from '@/components/SettingsPanel';
import NewProjectModal from '@/components/NewProjectModal';
import ToastContainer from '@/components/Toast';
import RunningSessionBar from '@/components/RunningSessionBar';
import { getActiveTodos } from '@/lib/todoAggregator';
import { saveProjects } from '@/lib/storage';
import { useSessionManager } from '@/hooks/useSessionManager';

export default function AppLayout({ children }) {
  const router = useRouter();
  const isLeftSidebarOpen = useProjectStore((s) => s.isLeftSidebarOpen);
  const setIsLeftSidebarOpen = useProjectStore((s) => s.setIsLeftSidebarOpen);
  const isSidebarOpen = useProjectStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useProjectStore((s) => s.setIsSidebarOpen);
  const isNewModalOpen = useProjectStore((s) => s.isNewModalOpen);
  const setIsNewModalOpen = useProjectStore((s) => s.setIsNewModalOpen);
  const createProject = useProjectStore((s) => s.createProject);
  const toasts = useProjectStore((s) => s.toasts);
  const dismissToast = useProjectStore((s) => s.dismissToast);
  const addToast = useProjectStore((s) => s.addToast);
  const projects = useProjectStore((s) => s.projects);
  const isStreamerMode = useProjectStore((s) => s.isStreamerMode);
  const runningSessions = useProjectStore((s) => s.runningSessions);
  const updateProject = useProjectStore((s) => s.updateProject);
  const toggleTodoInProject = useProjectStore((s) => s.toggleTodoInProject);
  const setSelectedProject = useProjectStore((s) => s.setSelectedProject);
  const setProjects = useProjectStore((s) => s.setProjects);

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { stopSession } = useSessionManager();

  const rehydrate = useProjectStore((s) => s.rehydrate);

  useEffect(() => { rehydrate(); }, [rehydrate]);

  const aggregatedTodos = useMemo(() => getActiveTodos(projects, 'priority'), [projects]);

  const handleToggleTodoFromSidebar = useCallback((projectId, todoId) => {
    const result = toggleTodoInProject(projectId, todoId);
    if (!result.success) {
      addToast(result.error || 'Failed to save changes', 'error');
    }
  }, [toggleTodoInProject, addToast]);

  const handleSidebarNavigate = useCallback((projectId) => {
    setIsSidebarOpen(false);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      router.push(`/?project=${projectId}`, { scroll: false });
    }
  }, [projects, setIsSidebarOpen, setSelectedProject, router]);

  const handleSidebarReorder = useCallback((reorderedTodos) => {
    const orderMap = {};
    reorderedTodos.forEach((todo, index) => {
      if (!orderMap[todo.projectId]) {
        orderMap[todo.projectId] = [];
      }
      orderMap[todo.projectId].push({ id: todo.id, order: index });
    });
    const updated = projects.map((project) => {
      if (!orderMap[project.id]) return project;
      const projectOrders = orderMap[project.id];
      const todoOrderMap = new Map(projectOrders.map(o => [o.id, o.order]));
      const newTodos = (project.todos || []).map((todo) => {
        if (todoOrderMap.has(todo.id)) {
          return { ...todo, order: todoOrderMap.get(todo.id) };
        }
        return todo;
      });
      return { ...project, todos: newTodos };
    });
    const result = saveProjects(updated);
    if (result.success) {
      setProjects(updated);
    } else {
      addToast(result.error || 'Failed to save todo reorder', 'error');
    }
  }, [projects, setProjects, addToast]);

  const handleSessionNavigate = useCallback((projectId) => {
    const project = projects.find((p) => String(p.id) === String(projectId));
    if (project) {
      setSelectedProject(project);
      router.push(`/?project=${projectId}`, { scroll: false });
    }
  }, [projects, router, setSelectedProject]);

  const handleSessionStop = useCallback((projectId) => {
    const p = projects.find((pr) => String(pr.id) === String(projectId));
    if (!p) return;
    stopSession(p, updateProject, addToast);
  }, [projects, updateProject, stopSession, addToast]);

  return (
    <div className={`min-h-screen flex overflow-hidden${isStreamerMode ? ' streamer-mode' : ''}`}>
      <LeftSidebar />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {(isLeftSidebarOpen || isSidebarOpen) && (
        <div
          className="fixed inset-0 bg-black/30 z-20 sidebar-backdrop lg:hidden"
          onClick={() => {
            if (isLeftSidebarOpen) setIsLeftSidebarOpen?.(false);
            if (isSidebarOpen) setIsSidebarOpen(false);
          }}
        />
      )}

      <MobileNavBar
        onToggleDrawer={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        isDrawerOpen={isMobileDrawerOpen}
      />

      <MobileNavDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      <div
        className="flex-1 min-w-0 transition-all duration-300 relative overflow-y-auto overflow-x-hidden content-with-sidebars"
        style={{ marginLeft: isLeftSidebarOpen ? '260px' : '56px', marginRight: isSidebarOpen ? '380px' : '0' }}
      >
        {children}
      </div>

      <ActiveTodosSidebar
        isOpen={isSidebarOpen}
        todos={aggregatedTodos}
        onToggleTodo={handleToggleTodoFromSidebar}
        onNavigateToProject={handleSidebarNavigate}
        onReorderTodos={handleSidebarReorder}
      />

      <RunningSessionBar
        runningSessions={runningSessions}
        projects={projects}
        onNavigate={handleSessionNavigate}
        onStopSession={handleSessionStop}
      />

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={(form) => {
          const result = createProject(form);
          if (result.success) {
            setIsNewModalOpen(false);
            addToast('Project created');
          } else {
            addToast(result.error || 'Failed to save project', 'error');
          }
        }}
      />

      <SettingsPanel />
    </div>
  );
}
