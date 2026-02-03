import React from 'react';
import { Session } from '../types';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineProps {
  sessions: Session[];
  onUpdateSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ sessions, onDeleteSession }) => {
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  return (
    <div className="w-full">
      <h2 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-4 px-1">
        Activity Log
      </h2>
      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {sortedSessions.length === 0 ? (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-textMuted text-sm text-center py-8 italic"
            >
              No sessions yet. Start tracking to see your timeline.
            </motion.p>
          ) : (
            sortedSessions.map((session) => (
              <TimelineItem key={session.id} session={session} onDelete={onDeleteSession} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TimelineItem: React.FC<{ session: Session; onDelete: (id: string) => void }> = ({ session, onDelete }) => {
  const start = new Date(session.start_time);
  const end = session.end_time ? new Date(session.end_time) : null;
  
  const duration = end 
    ? Math.round((end.getTime() - start.getTime()) / 60000) 
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between group hover:border-textMuted transition-colors shadow-sm"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${session.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-textMuted/50'}`} />
        
        <div className="min-w-0">
          <h3 className="text-textMain font-medium text-sm truncate">{session.category}</h3>
          <div className="text-xs text-textMuted font-mono mt-0.5 flex items-center gap-2">
            <span>{format(start, 'HH:mm')}</span>
            <span className="text-textMuted/50">→</span>
            <span className={session.is_active ? 'text-green-600 dark:text-green-400' : ''}>
              {end ? format(end, 'HH:mm') : 'Now'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4">
        {end && (
          <span className="text-xs font-mono text-textMuted bg-surfaceHighlight px-2 py-1 rounded-md">
            {duration}m
          </span>
        )}
        <button
          onClick={() => onDelete(session.id)}
          className="text-textMuted hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Delete session"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default Timeline;