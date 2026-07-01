'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-activity-calendar/tooltips.css';

const ActivityCalendar = dynamic(() =>
  import('react-activity-calendar').then((mod) => mod.ActivityCalendar),
  { ssr: false }
);
import useProjectStore from '@/store/useProjectStore';
import UtilityBar from '@/components/UtilityBar';
import { getActiveTodos } from '@/lib/todoAggregator';
import { exportToFile, importFromFile } from '@/lib/storage';
import { useConfirm } from '@/components/ConfirmModal';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import FocusedProject from '@/components/dashboard/FocusedProject';
import SwipeDeck from '@/components/dashboard/SwipeDeck';
import OtherProjects from '@/components/dashboard/OtherProjects';
import UrgentTodosPanel from '@/components/dashboard/UrgentTodosPanel';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function DashboardContent() {
  const router = useRouter();
  const confirm = useConfirm();
  const projects = useProjectStore((s) => s.projects);
  const ready = useProjectStore((s) => s.ready);
  const recordActivity = useProjectStore((s) => s.recordActivity);
  const addToast = useProjectStore((s) => s.addToast);
  const toggleTodoInProject = useProjectStore((s) => s.toggleTodoInProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setSelectedProject = useProjectStore((s) => s.setSelectedProject);
  const isDarkMode = useProjectStore((s) => s.isDarkMode);
  const setIsDarkMode = useProjectStore((s) => s.setIsDarkMode);
  const isStreamerMode = useProjectStore((s) => s.isStreamerMode);
  const setIsStreamerMode = useProjectStore((s) => s.setIsStreamerMode);
  const isSidebarOpen = useProjectStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useProjectStore((s) => s.setIsSidebarOpen);
  const replaceAllProjects = useProjectStore((s) => s.replaceAllProjects);
  const mergeProjects = useProjectStore((s) => s.mergeProjects);

  const today = getToday();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Dashboard | Projectory';
    recordActivity();
  }, [recordActivity]);

  const aggregatedTodos = useMemo(() => getActiveTodos(projects, 'priority'), [projects]);

  const focusedProject = useMemo(
    () => projects.find((p) => p.dailyFocusDate === today && p.status !== 'Archived'),
    [projects, today]
  );

  const visibleProjects = useMemo(
    () => projects.filter((p) => p.status !== 'Archived'),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return visibleProjects;
    const q = searchQuery.toLowerCase();
    return visibleProjects.filter((p) =>
      p.title.toLowerCase().includes(q) || (p.goal || '').toLowerCase().includes(q)
    );
  }, [visibleProjects, searchQuery]);

  const urgentTodos = useMemo(() => {
    const all = [];
    for (const p of projects) {
      if (p.status === 'Archived') continue;
      for (const t of (p.todos || [])) {
        if (!t.done && t.priority === 'High') {
          all.push({ ...t, projectTitle: p.title, projectId: p.id });
        }
      }
    }
    return all.slice(0, 5);
  }, [projects]);

  const swipeProjects = useMemo(() => {
    const shuffled = [...visibleProjects].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [visibleProjects]);

  const stats = useMemo(() => {
    const totalProjects = projects.filter((p) => p.status !== 'Archived').length;
    let todosDoneToday = 0;
    let totalUndone = 0;
    for (const p of projects) {
      for (const t of p.todos || []) {
        if (t.completedAt && t.completedAt.startsWith(today)) todosDoneToday++;
        if (!t.done) totalUndone++;
      }
    }
    const overdue = projects.filter((p) => {
      if (p.status === 'Finished' || p.status === 'Archived') return false;
      if (!p.deadline || p.deadline === 'Ongoing' || p.deadline === 'Completed') return false;
      return p.deadline < today;
    }).length;
    return { totalProjects, todosDoneToday, totalUndone, overdue };
  }, [projects, today]);

  const dailyBreakdown = useMemo(() => {
    const map = {};
    for (const p of projects) {
      const projectCreated = p.createdAt ? p.createdAt.slice(0, 10) : null;
      if (projectCreated) {
        if (!map[projectCreated]) map[projectCreated] = { todosCreated: 0, todosDone: 0, projectsCreated: 0 };
        map[projectCreated].projectsCreated = (map[projectCreated].projectsCreated || 0) + 1;
      }
      for (const t of p.todos || []) {
        if (t.createdAt) {
          const d = t.createdAt.slice(0, 10);
          if (!map[d]) map[d] = { todosCreated: 0, todosDone: 0, projectsCreated: 0 };
          map[d].todosCreated = (map[d].todosCreated || 0) + 1;
        }
        if (t.completedAt) {
          const d = t.completedAt.slice(0, 10);
          if (!map[d]) map[d] = { todosCreated: 0, todosDone: 0, projectsCreated: 0 };
          map[d].todosDone = (map[d].todosDone || 0) + 1;
        }
      }
    }
    return map;
  }, [projects]);

  const calendarData = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    const result = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const bd = dailyBreakdown[dateStr];
      const count = bd ? bd.todosCreated + bd.todosDone + bd.projectsCreated : 0;
      result.push({ date: dateStr, count, level: count > 0 ? Math.min(count, 4) : 0 });
    }
    return result;
  }, [dailyBreakdown]);

  const streakCount = useMemo(() => {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const bd = dailyBreakdown[ds];
      const hasActivity = bd && (bd.todosCreated > 0 || bd.todosDone > 0 || bd.projectsCreated > 0);
      if (hasActivity) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        if (i === 0) return count;
        break;
      }
    }
    return count;
  }, [dailyBreakdown]);

  const handleFocus = useCallback((project) => {
    const updated = {
      ...project,
      dailyFocusDate: today,
      timeline: [
        ...(project.timeline || []),
        { date: new Date().toISOString(), action: 'Locked as daily focus' }
      ],
    };
    const result = updateProject(updated);
    if (result.success) {
      addToast(`"${project.title}" is your focus for today`);
      recordActivity();
    } else {
      addToast('Failed to set focus', 'error');
    }
  }, [updateProject, addToast, recordActivity, today]);

  const handleCancel = useCallback(() => {
    if (!focusedProject) return;
    const updated = {
      ...focusedProject,
      dailyFocusDate: null,
      timeline: [
        ...(focusedProject.timeline || []),
        { date: new Date().toISOString(), action: 'Cancelled daily focus' }
      ],
    };
    const result = updateProject(updated);
    if (result.success) {
      addToast('Focus cancelled');
      recordActivity();
    } else {
      addToast('Failed to cancel focus', 'error');
    }
  }, [focusedProject, updateProject, addToast, recordActivity]);

  const handleToggleTodo = useCallback((projectId, todoId) => {
    const result = toggleTodoInProject(projectId, todoId);
    if (result.success) recordActivity();
  }, [toggleTodoInProject, recordActivity]);

  const handleNavigate = useCallback((projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      router.push(`/?project=${projectId}`, { scroll: false });
    }
  }, [projects, router, setSelectedProject]);

  const handleExport = useCallback(() => {
    exportToFile(projects);
    addToast('Projects exported');
  }, [projects, addToast]);

  const handleImport = useCallback(async (file) => {
    const { projects: imported, error } = await importFromFile(file);
    if (error) {
      addToast(error, 'error');
      return;
    }
    const ok = await confirm(`Replace all projects with ${imported.length} projects from the backup?`);
    if (ok) {
      const result = replaceAllProjects(imported);
      addToast(result.success ? `Imported ${imported.length} projects` : (result.error || 'Import failed'), result.success ? 'info' : 'error');
      return;
    }
    const result = mergeProjects(imported);
    addToast(result.success ? `Merged ${result.addedCount} new projects` : (result.error || 'Merge failed'), result.success ? 'info' : 'error');
  }, [addToast, confirm, replaceAllProjects, mergeProjects]);

  if (!ready) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 px-4 sm:px-6 pt-3 pb-2">
          <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Dashboard</h1>
          <UtilityBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onExport={handleExport}
            onImport={handleImport}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            activeTodosCount={aggregatedTodos.length}
            isStreamerMode={isStreamerMode}
            onToggleStreamerMode={() => {
              setIsStreamerMode(!isStreamerMode);
              addToast(isStreamerMode ? 'Streamer mode off' : 'Streamer mode on - sensitive content hidden');
            }}
          />
        </div>
      </header>

        <div className="flex-1 flex flex-col px-4 sm:px-6 py-4">
         <div className="grid gap-6 flex-1 min-h-0 lg:grid-cols-[1fr_1.5fr_1fr]">
           <div className="flex flex-col h-full min-h-0">
              <UrgentTodosPanel
               todos={urgentTodos}
               onToggle={handleToggleTodo}
               onNavigate={handleNavigate}
             />
           </div>

           <div className="flex flex-col h-full min-h-0">
               {focusedProject ? (
                <FocusedProject
                  project={focusedProject}
                  onCancel={handleCancel}
                  onToggleTodo={handleToggleTodo}
                  onUpdateProject={updateProject}
                  onNavigate={handleNavigate}
                />
              ) : (
                 <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 flex-1 min-h-0 overflow-y-auto">
                   <p className="text-sm font-medium text-[var(--text-primary)] mb-1">What should you work on today?</p>
                   <p className="text-xs text-[var(--text-muted)] mb-4">Pick a project to focus on.</p>
                  <SwipeDeck
                    projects={swipeProjects}
                    onFocus={handleFocus}
                    onNavigate={handleNavigate}
                  />
                </div>
              )}
           </div>

           <div className="grid gap-6 h-full min-h-0 lg:grid-rows-[4fr_6fr]">
             <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 overflow-hidden flex flex-col min-h-0">
               <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider shrink-0">Activity</h3>
               <div className="cal-hover overflow-y-auto flex-1 min-h-0">
                 <ActivityCalendar
                   data={calendarData}
                   blockSize={10}
                   blockRadius={2}
                   blockMargin={3}
                   fontSize={11}
                   showColorLegend={false}
                   showTotalCount={false}
                   tooltips={{
                     activity: {
                       text: (activity) => {
                         const bd = dailyBreakdown[activity.date];
                         const dateLabel = new Date(activity.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                         if (!bd || (bd.todosCreated === 0 && bd.todosDone === 0 && bd.projectsCreated === 0)) {
                           return `${dateLabel}: ${activity.count} action${activity.count !== 1 ? 's' : ''}`;
                         }
                         const parts = [];
                         if (bd.todosCreated > 0) parts.push(`${bd.todosCreated} created`);
                         if (bd.todosDone > 0) parts.push(`${bd.todosDone} done`);
                         if (bd.projectsCreated > 0) parts.push(`${bd.projectsCreated} project${bd.projectsCreated > 1 ? 's' : ''}`);
                         return `${dateLabel}: ${parts.join(', ')}`;
                       }
                     }
                   }}
                   theme={{
                     light: ['#f0f0f0', '#c4e4c0', '#8ccf8c', '#54b854', '#2d9e2d'],
                     dark: ['#2d2d2d', '#1a4d1a', '#2d7a2d', '#45a845', '#6ecf6e'],
                   }}
                 />
               </div>
               {streakCount > 0 && (
                 <p className="text-xs text-center text-[var(--text-muted)] mt-2 shrink-0">{streakCount}-day streak</p>
               )}
             </div>

              <div className="grid grid-cols-2 gap-3 overflow-hidden min-h-0">
                <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/30 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-semibold text-sky-600 dark:text-sky-400">{stats.totalProjects}</p>
                  <p className="text-xs text-sky-500/70 dark:text-sky-400/70">Projects</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{stats.todosDoneToday}</p>
                  <p className="text-xs text-emerald-500/70 dark:text-emerald-400/70">Done Today</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{stats.totalUndone}</p>
                  <p className="text-xs text-amber-500/70 dark:text-amber-400/70">Todo Remaining</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-semibold text-rose-600 dark:text-rose-400">{stats.overdue}</p>
                  <p className="text-xs text-rose-500/70 dark:text-rose-400/70">Overdue</p>
                </div>
              </div>
           </div>
         </div>

         <div className="mt-6">
           <OtherProjects
             projects={filteredProjects}
             focusedProjectId={focusedProject?.id}
             onNavigate={handleNavigate}
           />
         </div>
       </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
