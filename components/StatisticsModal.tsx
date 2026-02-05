import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart2, Calendar } from 'lucide-react';
import { Session } from '../types';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  format, isWithinInterval, subDays, subMonths
} from 'date-fns';
import { PieChart, StackedBarChart, ChartDataPoint, StackedBarDataPoint } from './Charts';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
}

type TimeRange = 'day' | 'week' | 'month' | 'year';

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#f97316', // Orange
];

const getColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
};

const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose, sessions }) => {
  const [range, setRange] = useState<TimeRange>('day');

  // Filter Data
  const { filteredSessions, periodLabel } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    let label = '';

    switch (range) {
      case 'day':
        start = startOfDay(now);
        end = endOfDay(now);
        label = format(now, 'MMMM d, yyyy');
        break;
      case 'week':
        start = subDays(now, 6); // Last 7 days including today
        end = endOfDay(now);
        label = 'Last 7 Days';
        break;
      case 'month':
        start = subDays(startOfWeek(now), 28); // Approx last 4 weeks
        // Or strictly startOfMonth
        // User request: "For the month category... cumulative time spent per category for each week of the month"
        // Let's do current month roughly.
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, 'MMMM yyyy');
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        label = format(now, 'yyyy');
        break;
    }

    const filtered = sessions.filter(s => {
      const sStart = new Date(s.start_time);
      return isWithinInterval(sStart, { start, end });
    });

    return { filteredSessions: filtered, periodLabel: label, start, end };
  }, [sessions, range]);

  // Process Data for Charts
  const chartData = useMemo(() => {
    // 1. Pie Data (Aggregate)
    const catMap: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const start = new Date(s.start_time).getTime();
      const end = s.end_time ? new Date(s.end_time).getTime() : new Date().getTime(); // Active counts till now
      const minutes = Math.round((end - start) / 60000);
      catMap[s.category] = (catMap[s.category] || 0) + minutes;
    });

    const pieData: ChartDataPoint[] = Object.entries(catMap)
      .map(([label, value]) => ({
        label,
        value,
        color: getColor(label)
      }))
      .sort((a, b) => b.value - a.value);

    // 2. Bar Data (Timeline)
    let barData: StackedBarDataPoint[] = [];
    const now = new Date();

    if (range === 'week') {
      // Daily breakdown
      const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
      barData = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        // Find sessions in this day
        // Note: Simple overlap logic. If session spans days, we roughly credit start time for now or strict split?
        // Simple implementation: Credit based on start time day for simplicity, 
        // to strictly split requires complex interval math. Given simple app, start time attribution is usually acceptable or splitting.
        // Let's do splitting for accuracy as requested "tracked per day".

        const segmentsMap: Record<string, number> = {};
        let total = 0;

        filteredSessions.forEach(s => {
          const sStart = new Date(s.start_time);
          let sEnd = s.end_time ? new Date(s.end_time) : new Date();

          // Check overlap
          const overlapStart = sStart < dayStart ? dayStart : sStart;
          const overlapEnd = sEnd > dayEnd ? dayEnd : sEnd;

          if (overlapStart < overlapEnd) {
            const mins = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
            segmentsMap[s.category] = (segmentsMap[s.category] || 0) + mins;
            total += mins;
          }
        });

        return {
          label: format(day, 'EEE'), // Mon, Tue...
          total,
          segments: Object.entries(segmentsMap).map(([key, value]) => ({
            key, value, color: getColor(key), label: key
          }))
        };
      });
    } else if (range === 'month') {
      // Weekly breakdown
      // "list the cumulative time spent per category for each week of the month"
      const weeks = eachWeekOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
      barData = weeks.map((weekStart, idx) => {
        const weekEnd = endOfWeek(weekStart);
        const segmentsMap: Record<string, number> = {};
        let total = 0;

        filteredSessions.forEach(s => {
          const sStart = new Date(s.start_time);
          let sEnd = s.end_time ? new Date(s.end_time) : new Date();

          const overlapStart = sStart < weekStart ? weekStart : sStart;
          const overlapEnd = sEnd > weekEnd ? weekEnd : sEnd;

          if (overlapStart < overlapEnd) {
            const mins = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
            segmentsMap[s.category] = (segmentsMap[s.category] || 0) + mins;
            total += mins;
          }
        });

        return {
          label: `W${idx + 1}`,
          total,
          segments: Object.entries(segmentsMap).map(([key, value]) => ({
            key, value, color: getColor(key), label: key
          }))
        }
      });

    } else if (range === 'year') {
      // Monthly breakdown
      const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
      barData = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const segmentsMap: Record<string, number> = {};
        let total = 0;

        filteredSessions.forEach(s => {
          const sStart = new Date(s.start_time);
          let sEnd = s.end_time ? new Date(s.end_time) : new Date();

          const overlapStart = sStart < monthStart ? monthStart : sStart;
          const overlapEnd = sEnd > monthEnd ? monthEnd : sEnd;

          if (overlapStart < overlapEnd) {
            const mins = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
            segmentsMap[s.category] = (segmentsMap[s.category] || 0) + mins;
            total += mins;
          }
        });

        return {
          label: format(month, 'MMM'),
          total,
          segments: Object.entries(segmentsMap).map(([key, value]) => ({
            key, value, color: getColor(key), label: key
          }))
        }
      });
    }

    return { pieData, barData };
  }, [filteredSessions, range]);

  const tabs: { id: TimeRange; label: string }[] = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
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
            className="bg-surface w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl overflow-hidden"
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
                  onClick={() => setRange(tab.id)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${range === tab.id
                      ? 'bg-textMain text-surface'
                      : 'text-textMuted hover:bg-surfaceHighlight'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-5 space-y-8 flex-1">

              <div className="text-center">
                <p className="text-xs text-textMuted uppercase tracking-wider">{periodLabel}</p>
              </div>

              {/* Pie Chart Section */}
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-textMain mb-4">Distribution</h3>
                {chartData.pieData.length > 0 ? (
                  <PieChart data={chartData.pieData} size={220} />
                ) : (
                  <p className="text-textMuted text-sm italic py-10">No activities recorded.</p>
                )}

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  {chartData.pieData.map(d => (
                    <div key={d.label} className="flex items-center gap-1.5 bg-surfaceHighlight/50 px-2 py-1 rounded-lg border border-border/50">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-textMain font-medium">{d.label}</span>
                      <span className="text-[10px] text-textMuted ml-1">{Math.round(d.value)}m</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart Section (Week/Month/Year only) */}
              {range !== 'day' && chartData.barData.length > 0 && (
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-textMain mb-6 text-center">Trend</h3>
                  <div className="px-2">
                    <StackedBarChart data={chartData.barData} height={180} />
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatisticsModal;