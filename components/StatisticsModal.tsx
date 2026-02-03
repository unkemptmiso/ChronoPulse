import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Calendar, Clock, BarChart2, Hash, Trophy } from 'lucide-react';
import { Session, Category } from '../types';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { analyzeProductivity } from '../services/geminiService';
import { exportData } from '../services/storageService';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
}

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose, sessions }) => {
  const [range, setRange] = useState<TimeRange>('day');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Filter sessions based on range
  const filteredSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter(s => {
      const start = new Date(s.start_time);
      switch (range) {
        case 'day': return isSameDay(start, now);
        case 'week': return isSameWeek(start, now, { weekStartsOn: 1 });
        case 'month': return isSameMonth(start, now);
        case 'year': return isSameYear(start, now);
        case 'all': return true;
        default: return true;
      }
    });
  }, [sessions, range]);

  // Calculate Stats
  const stats = useMemo(() => {
    let totalMs = 0;
    const catMap: Record<string, number> = {};
    const count = filteredSessions.length;

    filteredSessions.forEach(s => {
      const start = new Date(s.start_time).getTime();
      const end = s.end_time ? new Date(s.end_time).getTime() : new Date().getTime();
      const duration = end - start;
      
      totalMs += duration;
      catMap[s.category] = (catMap[s.category] || 0) + duration;
    });

    const sortedCats = Object.entries(catMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, duration]) => ({ name, duration }));

    return {
      totalMs,
      count,
      sortedCats,
      topCategory: sortedCats[0]?.name || '-',
      avgSession: count > 0 ? totalMs / count : 0
    };
  }, [filteredSessions]);

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    // Export only the filtered view for context-aware analysis
    const data = exportData(filteredSessions); 
    const promptPrefix = `Analyze this ${range}ly productivity data: `;
    const result = await analyzeProductivity(promptPrefix + data);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const tabs: { id: TimeRange; label: string }[] = [
    { id: 'day', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'all', label: 'All' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
              <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
                <BarChart2 size={20} /> Statistics
              </h2>
              <button onClick={onClose} className="text-textMuted hover:text-textMain p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-1 border-b border-border overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setRange(tab.id);
                    setAnalysisResult(null); // Clear analysis on tab switch
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    range === tab.id 
                      ? 'bg-textMain text-surface' 
                      : 'text-textMuted hover:bg-surfaceHighlight'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-5 space-y-6 flex-1">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surfaceHighlight/50 p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 text-textMuted mb-1 text-xs uppercase tracking-wider">
                    <Clock size={12} /> Total Time
                  </div>
                  <div className="text-xl font-bold text-textMain">{formatDuration(stats.totalMs)}</div>
                </div>
                <div className="bg-surfaceHighlight/50 p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 text-textMuted mb-1 text-xs uppercase tracking-wider">
                    <Trophy size={12} /> Top Focus
                  </div>
                  <div className="text-xl font-bold text-textMain truncate">{stats.topCategory}</div>
                </div>
                <div className="bg-surfaceHighlight/50 p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 text-textMuted mb-1 text-xs uppercase tracking-wider">
                    <Hash size={12} /> Sessions
                  </div>
                  <div className="text-xl font-bold text-textMain">{stats.count}</div>
                </div>
                <div className="bg-surfaceHighlight/50 p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 text-textMuted mb-1 text-xs uppercase tracking-wider">
                    <Calendar size={12} /> Avg Session
                  </div>
                  <div className="text-xl font-bold text-textMain">{formatDuration(stats.avgSession)}</div>
                </div>
              </div>

              {/* Breakdown Chart */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Breakdown</h3>
                {stats.sortedCats.length === 0 ? (
                  <p className="text-textMuted text-sm text-center py-4 italic">No data for this period.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.sortedCats.map((cat, idx) => {
                      const percentage = Math.round((cat.duration / stats.totalMs) * 100);
                      return (
                        <div key={cat.name} className="group">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-textMain">{cat.name}</span>
                            <span className="text-textMuted font-mono text-xs">{formatDuration(cat.duration)} ({percentage}%)</span>
                          </div>
                          <div className="h-2 w-full bg-surfaceHighlight rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.05 }}
                              className={`h-full rounded-full ${idx === 0 ? 'bg-textMain' : 'bg-textMuted'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gemini Section */}
              <div className="pt-4 border-t border-border">
                {!analysisResult ? (
                   <button
                   onClick={handleAnalyze}
                   disabled={isAnalyzing || stats.count === 0}
                   className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
                 >
                   {isAnalyzing ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <>
                       <Sparkles size={18} />
                       Generate AI Insight
                     </>
                   )}
                 </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surfaceHighlight/30 border border-purple-500/20 rounded-xl p-4"
                  >
                     <div className="flex items-center justify-between mb-3 text-purple-500">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} />
                        <h3 className="font-semibold text-sm uppercase tracking-wider">Gemini Insight</h3>
                      </div>
                      <button onClick={() => setAnalysisResult(null)} className="text-xs hover:underline opacity-70">Reset</button>
                    </div>
                    <div className="prose prose-sm max-w-none text-textMain text-sm whitespace-pre-line leading-relaxed opacity-90">
                      {analysisResult}
                    </div>
                  </motion.div>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatisticsModal;