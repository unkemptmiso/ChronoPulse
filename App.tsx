import React, { useState, useEffect } from 'react';
import { Session, Category } from './types';
import {
  loadSessions,
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
import { Activity, Settings, BarChart2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';

const App: React.FC = () => {
  // Use lazy initialization to load data synchronously before first render
  // Initialize empty, then load
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [finishLoading, setFinishLoading] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Load initial data
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

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
        loadData().finally(() => clearTimeout(safetyTimeout));
      } else {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    }).catch(err => {
      console.error("Auth session check failed:", err);
      setLoading(false);
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
    setLoading(true);
    const loaded = await loadSessions();
    setSessions(loaded);
    setLoading(false);
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

  const handleStartSession = (category: Category) => {
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

    const newSession = createSession(category, user?.id);
    // Optimistically update UI
    setSessions([newSession, ...updatedSessions]);

    // Persist changes
    if (activeSession) {
      // We need to save the stopped session
      const stoppedSession = updatedSessions.find(s => s.id === activeSession.id);
      if (stoppedSession) {
        saveSession(stoppedSession).then(({ error }) => {
          if (error) setLastError(error.message);
        });
      }
    }
    saveSession(newSession).then(({ error }) => {
      if (error) setLastError(error.message);
    });
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
    <div className="min-h-screen bg-background text-textMain pb-safe transition-colors duration-300 pt-8">
      <DebugConsole user={user} lastError={lastError} />
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50 transition-colors duration-300">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-textMain">
            <Activity className="text-textMain" size={20} />
            ChronoPulse
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
              key={cat}
              category={cat}
              activeSession={activeSession?.category === cat ? activeSession : undefined}
              onStart={handleStartSession}
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
            sessions={sessions}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
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

      {/* Debug Footer */}
      {lastError && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 text-xs font-mono z-50">
          <p className="font-bold">Sync Error:</p>
          <p>{lastError}</p>
          <button onClick={() => setLastError(null)} className="mt-2 text-white/80 underline">Dismiss</button>
        </div>
      )}
      <div className="fixed bottom-0 right-0 p-1 text-[10px] text-textMuted opacity-50 pointer-events-none">
        User: {user?.id?.slice(0, 4)}...
      </div>
    </div>
  );
};

const DebugConsole = ({ user, lastError }: { user: any, lastError: string | null }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-black/90 text-green-400 p-2 text-[10px] font-mono z-[100] border-b border-green-500/50 pointer-events-none">
      <div className="flex justify-between max-w-md mx-auto">
        <div>
          <span className="text-white font-bold">DEBUG:</span> {user ? 'LOGGED IN' : 'NO USER'}
        </div>
        <div>
          ID: {user?.id ? user.id.slice(0, 8) + '...' : 'NULL'}
        </div>
      </div>
      {lastError && (
        <div className="text-red-500 font-bold mt-1 bg-white/10 p-1">
          ERROR: {lastError}
        </div>
      )}
    </div>
  );
};

export default App;