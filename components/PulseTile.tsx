import React, { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Category, Session } from '../types';
import { Briefcase, Zap, Code, Circle, Dumbbell, ChevronUp, Activity, Hash, Coffee, Book, Music, Gamepad2 } from 'lucide-react';
import clsx from 'clsx';

interface PulseTileProps {
  category: Category;
  activeSession?: Session;
  onStart: (category: Category) => void;
  onStop: (sessionId: string) => void;
}

// Extended icon map to handle more defaults, but fallback to Activity
const CategoryIcons: Record<string, React.ElementType> = {
  'Work': Briefcase,
  'ELXR': Zap,
  'Coding': Code,
  'BLANK': Circle,
  'Working out': Dumbbell,
  'Reading': Book,
  'Break': Coffee,
  'Music': Music,
  'Gaming': Gamepad2,
};

const PulseTile: React.FC<PulseTileProps> = ({ category, activeSession, onStart, onStop }) => {
  const [elapsed, setElapsed] = useState<string>('00:00:00');
  const controls = useAnimation();
  const isActive = !!activeSession;

  const Icon = CategoryIcons[category] || Activity;

  // Timer logic for active session
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && activeSession) {
      const updateTimer = () => {
        const start = new Date(activeSession.start_time).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        
        setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsed('00:00:00');
    }
    return () => clearInterval(interval);
  }, [isActive, activeSession]);

  const handlePointerDown = () => {
    controls.start({
      scale: 0.95,
      transition: { duration: 0.1 }
    });
  };

  const handlePointerUp = () => {
    controls.start({ scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } });
  };

  const handleTap = () => {
    if (isActive && activeSession) {
      onStop(activeSession.id);
    } else {
      onStart(category);
    }
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isActive && activeSession && info.offset.y < -50) {
      onStop(activeSession.id);
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
    }
  };

  return (
    <div className="relative w-full h-32 select-none touch-none">
      <motion.div
        animate={controls}
        onTap={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        drag={isActive ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.2, bottom: 0.05 }}
        onDragEnd={handleDragEnd}
        className={clsx(
          "relative z-10 w-full h-full rounded-2xl border flex flex-col items-center justify-center transition-all duration-500 overflow-hidden cursor-pointer",
          isActive 
            ? "bg-surfaceHighlight border-textMain/20 shadow-glow" 
            : "bg-surface border-border hover:border-textMuted shadow-sm"
        )}
      >
        {/* Active Glow Pulse */}
        {isActive && (
          <div className="absolute inset-0 bg-textMain/5 animate-pulse-slow pointer-events-none" />
        )}

        {/* Content */}
        <div className="flex flex-col items-center gap-2 z-20">
          <Icon 
            size={32} 
            className={clsx("transition-colors duration-300", isActive ? "text-textMain" : "text-textMuted")}
            strokeWidth={1.5}
          />
          <span className={clsx("text-sm font-medium tracking-wide", isActive ? "text-textMain" : "text-textMuted")}>
            {category.toUpperCase()}
          </span>
          
          {isActive && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-mono text-textMain/80 mt-1"
            >
              {elapsed}
            </motion.div>
          )}

          {isActive && (
            <div className="absolute bottom-2 text-[10px] text-textMuted uppercase tracking-widest flex flex-col items-center gap-1 opacity-50">
               <ChevronUp size={12} className="animate-bounce" />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PulseTile;