import React, { useState, useEffect } from 'react';
import { Session, Category } from './types';
import { 
  loadSessions, 
  saveSessions, 
  createSession, 
  exportData, 
  exportToCSV, 
  loadCategories, 
  saveCategories,
  loadTheme,
  saveTheme,
  clearAllData
} from './services/storageService';
import { analyzeProductivity } from './services/geminiService';
import PulseTile from './components/PulseTile';
import Timeline from './components/Timeline';
import Guardrail from './components/Guardrail';
import SettingsModal from './components/SettingsModal';
import { Sparkles, X, Activity, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialization
  useEffect(() => {
    setSessions(loadSessions());
    setCategories(loadCategories());
    
    const savedTheme = loadTheme();
    setTheme(savedTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(savedTheme);
  }, []);

  // Persistence effects
  useEffect(() => {
    if (sessions.length > 0) saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (categories.length > 0) saveCategories(categories);
  }, [categories]);

  const handleThemeToggle = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    saveTheme(newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
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

    const newSession = createSession(category);
    setSessions([newSession, ...updatedSessions]);
  };

  const handleStopSession = (sessionId: string) => {
    const now = new Date().toISOString();
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, end_time: now, is_active: false } 
        : s
    ));
  };

  const handleUpdateSession = (updatedSession: Session) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleClearData = () => {
    clearAllData();
    setSessions([]);
    setCategories(loadCategories()); // Reset to default or empty
    setIsSettingsOpen(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const data = exportData(sessions);
    const result = await analyzeProductivity(data);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const totalDurationToday = sessions
    .filter(s => {
      const d = new Date(s.start_time);
      const today = new Date();
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    })
    .reduce((acc, s) => {
      const end = s.end_time ? new Date(s.end_time).getTime() : new Date().getTime();
      const start = new Date(s.start_time).getTime();
      return acc + (end - start);
    }, 0);

  const hours = Math.floor(totalDurationToday / 3600000);
  const minutes = Math.floor((totalDurationToday % 3600000) / 60000);

  return (
    <div className="min-h-screen bg-background text-textMain pb-safe transition-colors duration-300">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50 transition-colors duration-300">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-textMain">
            <Activity className="text-textMain" size={20} />
            ChronoPulse
          </h1>
          <p className="text-textMuted text-xs mt-1 font-mono">
            TODAY: <span className="text-textMain">{hours}h {minutes}m</span>
          </p>
        </div>
        
        <div className="flex gap-2">
           <button 
            onClick={() => setIsSettingsOpen(true)}
            className="bg-surface hover:bg-surfaceHighlight border border-border text-textMain rounded-full p-2 transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-textMain text-surface hover:opacity-90 rounded-full p-2 transition-colors disabled:opacity-50"
            aria-label="Analyze with Gemini"
          >
            {isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            ) : (
              <Sparkles size={20} />
            )}
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
               No activities found.<br/>Add one in Settings.
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

      {/* Analysis Modal */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setAnalysisResult(null)}
          >
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl relative"
            >
              <button 
                onClick={() => setAnalysisResult(null)}
                className="absolute top-4 right-4 text-textMuted hover:text-textMain"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-2 mb-4 text-purple-500">
                <Sparkles size={18} />
                <h3 className="font-semibold text-sm uppercase tracking-wider">Gemini Analysis</h3>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <div className="text-textMain whitespace-pre-line leading-relaxed">
                  {analysisResult}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;