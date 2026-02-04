import { Session, Category } from '../types';
import { STORAGE_KEY, CATEGORIES as DEFAULT_CATEGORIES } from '../constants';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from './supabaseClient';
import { PostgrestError } from '@supabase/supabase-js';

const CATEGORIES_KEY = 'chronopulse_categories_v1';
const THEME_KEY = 'chronopulse_theme_v1';

// --- Sessions ---

export const loadSessions = async (): Promise<Session[]> => {
  // 1. Try Supabase first (if configured)
  if (supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('start_time', { ascending: false });

    if (!error && data) {
      // Update local storage cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data as Session[];
    } else if (error) {
      console.error("Supabase load error:", error);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load sessions locally", e);
    return [];
  }
};

export const saveSession = async (session: Session) => {
  // 1. Get current user 
  let userId = session.user_id;

  if (supabase && !userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }

  // Update session object with user_id if found
  const sessionToSave = userId ? { ...session, user_id: userId } : session;

  // 2. Save to LocalStorage immediately (optimistic)
  const currentSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  // Update local cache
  const updatedSessions = [sessionToSave, ...currentSessions.filter((s: Session) => s.id !== session.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));

  // 3. Sync to Supabase
  if (supabase && userId) {
    const { error } = await supabase
      .from('sessions')
      .upsert(sessionToSave);

    if (error) console.error("Supabase save error:", error);
  }
};

export const deleteSession = async (sessionId: string) => {
  // 1. Local
  const currentSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const updatedSessions = currentSessions.filter((s: Session) => s.id !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));

  // 2. Remote
  if (supabase) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);
    if (error) console.error("Supabase delete error:", error);
  }
};

// Deprecated: pure local save for bulk updates (keeping for compatibility if needed, but best to use individual ops or bulk upsert)
export const saveSessionsLocal = (sessions: Session[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save sessions", e);
  }
}

export const loadCategories = (): Category[] => {
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
};

export const saveCategories = (categories: Category[]) => {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error("Failed to save categories", e);
  }
};

export const loadTheme = (): 'light' | 'dark' => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const saveTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem(THEME_KEY, theme);
};

export const createSession = (category: Category, userId?: string): Session => {
  return {
    id: uuidv4(),
    user_id: userId,
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

export const exportToCSV = (sessions: Session[]) => {
  const headers = ["Category", "Start Time", "End Time", "Duration (Minutes)", "Status"];
  const rows = sessions.map(s => {
    const start = new Date(s.start_time);
    const end = s.end_time ? new Date(s.end_time) : null;
    const duration = end
      ? Math.round((end.getTime() - start.getTime()) / 60000)
      : 0;

    return [
      `"${s.category}"`,
      `"${start.toLocaleString()}"`,
      `"${end ? end.toLocaleString() : ''}"`,
      `"${end ? duration : ''}"`,
      `"${s.is_active ? 'Active' : 'Completed'}"`
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8,"
    + [headers.join(","), ...rows].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `chronopulse_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CATEGORIES_KEY);
};