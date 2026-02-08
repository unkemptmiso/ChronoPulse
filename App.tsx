import React, { useState, useEffect, useMemo } from 'react';
import { Session, Category, CategoryItem } from './types';
import {
  loadSessions,
  loadSessionsLocal,
  saveSession,
  deleteSession,
  createSession,
  exportToCSV,
  loadCategories,
  saveCategories,
  loadTheme,
  saveTheme,
  clearAllData
} from './services/storageService';
import PulseTile from './components/PulseTile';
import Timeline from './components/Timeline';
import Guardrail from './components/Guardrail';
import SettingsModal from './components/SettingsModal';
import StatisticsModal from './components/StatisticsModal';
import EditSessionModal from './components/EditSessionModal';
import { Zap, Settings, BarChart2, Activity } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { format, isSameDay } from 'date-fns';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';

const App: React.FC = () => {
  // Use lazy initialization to load data synchronously before first render
  // Initialize with local data immediately
  const [sessions, setSessions] = useState<Session[]>(() => loadSessionsLocal());
  const [categories, setCategories] = useState<CategoryItem[]>(() => loadCategories());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [finishLoading, setFinishLoading] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Edit Modal State
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load initial data
  const [user, setUser] = useState<any>(null);
  // Do not block initial render on auth/remote load
  const [loading, setLoading] = useState(false);

  // Auth & Initial Data Load
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Safety timeout: stop loading after 5 seconds if auth hangs
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("Auth check timed out, forcing load completion.");
        return false;
      });
    }, 5000);

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Sync remote data in background
        loadData().finally(() => clearTimeout(safetyTimeout));
      } else {
        clearTimeout(safetyTimeout);
      }
    }).catch(err => {
      console.error("Auth session check failed:", err);
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData();
      }
    });

    return () => {
      subscription?.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const loadData = async () => {
    // Background sync
    const loaded = await loadSessions();
    setSessions(loaded);
    setFinishLoading(true);
  };

  // Apply theme side-effects
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    saveTheme(theme);
  }, [theme]);

  // Remove the effect that saves ALL sessions on every change,
  // because we now handle saves granularly in handlers to interact with DB efficiently.
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);


  const handleThemeToggle = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const activeSession = sessions.find(s => s.is_active);

  // Filter sessions for timeline (Today ONLY, or active)
  const timelineSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter(s => {
      if (s.is_active) return true;
      // If session ended, check if it ended today
      const end = new Date(s.end_time!);
      return isSameDay(end, now);
    });
  }, [sessions]);

  const handleStartSession = (categoryItem: CategoryItem) => {
    const now = new Date().toISOString();
    let updatedSessions = [...sessions];

    // If there is an active session, stop it first
    if (activeSession) {
      updatedSessions = updatedSessions.map(s =>
        s.id === activeSession.id
          ? { ...s, end_time: now, is_active: false }
          : s
      );
    }

    const newSession = createSession(categoryItem.name, user?.id);
    // Optimistically update UI
    setSessions([newSession, ...updatedSessions]);

    // Persist changes
    if (activeSession) {
      // We need to save the stopped session
      const stoppedSession = updatedSessions.find(s => s.id === activeSession.id);
      if (stoppedSession) saveSession(stoppedSession);
    }
    saveSession(newSession);
  };

  const handleStopSession = (sessionId: string) => {
    const now = new Date().toISOString();

    // Find and clone the session to update
    const sessionToStop = sessions.find(s => s.id === sessionId);
    if (!sessionToStop) return;

    const stoppedSession = { ...sessionToStop, end_time: now, is_active: false };

    // Update local state first
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? stoppedSession : s
    ));

    // Persist
    saveSession(stoppedSession);
  };

  const handleUpdateSession = (updatedSession: Session) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    saveSession(updatedSession);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    deleteSession(id);
  };

  const handleClearData = () => {
    clearAllData();
    // Reset state to defaults
    setSessions([]);
    setCategories(loadCategories());
    setIsSettingsOpen(false);
  };

  // Edit Handlers
  const openEditModal = (session: Session) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-textMain gap-4">
        <Activity className="animate-pulse w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!user && supabase) {
    return <Auth />;
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-textMain p-6 text-center">
        <Activity className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Configuration Error</h2>
        <p className="text-textMuted max-w-sm">
          Supabase credentials not found. The app cannot start without a valid database connection.
          Please ensure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set in your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-textMain pb-safe transition-colors duration-300">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50 transition-colors duration-300">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-textMain">
            <Zap className="text-textMain" size={20} />
            Chrono
          </h1>
          <p className="text-textMuted text-xs mt-1 font-mono uppercase tracking-wider">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsStatsOpen(true)}
            className="bg-surface hover:bg-surfaceHighlight border border-border text-textMain rounded-full p-2 transition-colors"
            aria-label="Statistics"
          >
            <BarChart2 size={20} />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-surface hover:bg-surfaceHighlight border border-border text-textMain rounded-full p-2 transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-8">
        <Guardrail sessions={sessions} />

        {/* Tiles Grid */}
        <section className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <PulseTile
              key={cat.id}
              category={cat}
              activeSession={activeSession?.category === cat.name ? activeSession : undefined}
              onStart={() => handleStartSession(cat)}
              onStop={handleStopSession}
            />
          ))}
          {categories.length === 0 && (
            <div className="col-span-2 py-8 text-center text-textMuted text-sm border-2 border-dashed border-border rounded-xl">
              No activities found.<br />Add one in Settings.
            </div>
          )}
        </section>

        {/* Timeline */}
        <section>
          <Timeline
            sessions={timelineSessions}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
            onEditSession={openEditModal}
          />
        </section>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        onUpdateCategories={setCategories}
        theme={theme}
        onToggleTheme={handleThemeToggle}
        onExportCSV={() => exportToCSV(sessions)}
        onClearData={handleClearData}
      />

      {/* Statistics & Analysis Modal */}
      <StatisticsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        sessions={sessions}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        session={editingSession}
        onSave={handleUpdateSession}
      />

    </div>
  );
};

export default App;