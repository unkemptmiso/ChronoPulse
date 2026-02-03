import React, { useState } from 'react';
import { Session } from '../types';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineProps {
  sessions: Session[];
  onUpdateSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
}

const TimelineItem: React.FC<{ 
  session: Session, 
  onUpdate: (s: Session) => void,
  onDelete: (id: string) => void 
}> = ({ session, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const duration = session.end_time 
    ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)
    : 0;

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    // Value format from input type="datetime-local": YYYY-MM-DDTHH:mm
    const date = new Date(value);
    const updated = { ...session };
    if (type === 'start') updated.start_time = date.toISOString();
    if (type === 'end') updated.end_time = date.toISOString();
    onUpdate(updated);
  };

  // Helper to format for input
  const toInputFormat = (isoString: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    // Adjust for local timezone offset for the input
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-l border-neutral-800 pl-4 py-4 relative group"
    >
      <div className="absolute -left-[5px] top-6 w-2.5 h-2.5 rounded-full bg-neutral-800 border-2 border-black group-hover:bg-white transition-colors" />
      
      <div className="flex justify-between items-start" onClick={() => setIsEditing(!isEditing)}>
        <div>
          <h4 className="text-white font-medium">{session.category}</h4>
          <p className="text-neutral-500 text-xs mt-1">
            {format(new Date(session.start_time), 'MMM d, HH:mm')} 
            {session.end_time && ` - ${format(new Date(session.end_time), 'HH:mm')}`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-white font-mono text-sm block">
            {session.is_active ? 'ACTIVE' : `${Math.floor(duration / 60)}h ${duration % 60}m`}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && !session.is_active && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 bg-neutral-900/50 rounded-lg p-3 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 uppercase">Start</label>
                <input 
                  type="datetime-local" 
                  value={toInputFormat(session.start_time)}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  className="bg-black border border-neutral-800 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 uppercase">End</label>
                <input 
                  type="datetime-local" 
                  value={toInputFormat(session.end_time)}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                  className="bg-black border border-neutral-800 rounded px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                className="text-danger text-xs flex items-center gap-1 hover:text-red-400"
              >
                <Trash2 size={12} /> Delete Entry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Timeline: React.FC<TimelineProps> = ({ sessions, onUpdateSession, onDeleteSession }) => {
  // Sort by start time descending
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  return (
    <div className="space-y-1 pb-24">
      <h3 className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-4 pl-4">Recent Timeline</h3>
      {sortedSessions.length === 0 ? (
        <div className="text-center py-10 text-neutral-700 text-sm italic">
          No sessions recorded. <br/> Long press a tile to start.
        </div>
      ) : (
        sortedSessions.map(session => (
          <TimelineItem 
            key={session.id} 
            session={session} 
            onUpdate={onUpdateSession}
            onDelete={onDeleteSession}
          />
        ))
      )}
    </div>
  );
};

export default Timeline;