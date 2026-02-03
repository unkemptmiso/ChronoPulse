import { Category } from './types';

export const CATEGORIES: Category[] = ['Work', 'ELXR', 'Coding', 'BLANK', 'Working out'];

export const STORAGE_KEY = 'chronopulse_data_v1';

export const GEMINI_MODEL = 'gemini-3-flash-preview';

export const SYSTEM_INSTRUCTION = `You are an expert productivity analyst. 
Analyze the provided JSON time tracking data. 
Identify trends, calculate total hours per category, and spot potential burnout risks (sessions > 8 hours without breaks).
Provide a concise, bulleted summary of the user's productivity habits.
Voice: Professional, concise, data-driven.`;