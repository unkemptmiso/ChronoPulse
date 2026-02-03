export type Category = 'Work' | 'ELXR' | 'Coding' | 'BLANK' | 'Working out';

export interface Session {
  id: string;
  category: Category;
  start_time: string; // ISO string
  end_time: string | null; // ISO string or null if active
  is_active: boolean;
  synced?: boolean; // Local state flag
}

export interface PulseState {
  sessions: Session[];
  activeSessions: Record<string, string>; // category -> session_id
}

export interface DailySummary {
  totalDuration: number; // in milliseconds
  categoryBreakdown: Record<Category, number>;
}