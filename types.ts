export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export type Category = string; // Legacy support for Session.category (name)

export interface Session {
  id: string;
  user_id?: string; // Supabase Owner UUID
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