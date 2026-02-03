import React from 'react';
import { Session } from '../types';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface GuardrailProps {
  sessions: Session[];
}

const Guardrail: React.FC<GuardrailProps> = ({ sessions }) => {
  const longRunningSessions = sessions.filter(s => {
    if (!s.is_active) return false;
    const start = new Date(s.start_time).getTime();
    const now = new Date().getTime();
    const hours = (now - start) / 3600000;
    return hours > 24;
  });

  if (longRunningSessions.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-6 bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex items-start gap-3"
    >
      <AlertTriangle className="text-red-500 shrink-0" size={20} />
      <div>
        <h4 className="text-red-400 font-medium text-sm">Long Session Detected</h4>
        <p className="text-red-400/70 text-xs mt-1">
          You have {longRunningSessions.length} session(s) running for over 24 hours. 
          Please verify or stop them.
        </p>
      </div>
    </motion.div>
  );
};

export default Guardrail;