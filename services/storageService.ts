import { Session, Category } from '../types';
import { STORAGE_KEY, CATEGORIES as DEFAULT_CATEGORIES } from '../constants';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES_KEY = 'chronopulse_categories_v1';
const THEME_KEY = 'chronopulse_theme_v1';

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
  } catch (e) {
    console.error("Failed to save sessions", e);
  }
};

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
  link.setAttribute("download", `chronopulse_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CATEGORIES_KEY);
};