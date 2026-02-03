import { Session, Category } from '../types';
import { STORAGE_KEY } from '../constants';
import { v4 as uuidv4 } from 'uuid';

// In a real app, we would import createClient from @supabase/supabase-js
// import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for demonstration if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const loadSessions = (): Session[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load sessions", e);
    return [];
  }
};

export const saveSessions = (sessions: Session[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    // Trigger background sync here if Supabase is connected
    // syncWithSupabase(sessions);
  } catch (e) {
    console.error("Failed to save sessions", e);
  }
};

export const createSession = (category: Category): Session => {
  return {
    id: uuidv4(),
    category,
    start_time: new Date().toISOString(),
    end_time: null,
    is_active: true,
    synced: false
  };
};

export const exportData = (sessions: Session[]): string => {
  return JSON.stringify(sessions.map(s => ({
    category: s.category,
    start: s.start_time,
    end: s.end_time || "ACTIVE",
    duration_minutes: s.end_time 
      ? Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000) 
      : "ONGOING"
  })), null, 2);
};