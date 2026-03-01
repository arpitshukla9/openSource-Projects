/**
 * Core data models for CodePulse
 */

/** One typing session (start → 10s pause → end) */
export interface TypingSession {
  id: string; // nanoid, 8 chars
  startTime: number; // Unix timestamp ms
  endTime: number; // Unix timestamp ms
  durationSeconds: number; // endTime - startTime / 1000
  characters: number; // only additions, not deletions
  words: number;
  lines: number;
  language: string; // e.g. "typescript", "python"
  fileCount: number; // how many different files touched
  date: string; // "YYYY-MM-DD" local time
}

/** Aggregated stats for one calendar day */
export interface DayStats {
  date: string;
  totalActiveSeconds: number;
  totalCharacters: number;
  totalWords: number;
  totalLines: number;
  sessionCount: number;
  languageBreakdown: Record<string, number>; // lang → seconds
  goalHit: boolean;
}

/** Streak state */
export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string; // "YYYY-MM-DD"
  freezesAvailable: number; // max 2
  freezeLastReplenished: string; // "YYYY-MM-DD"
  totalDaysActive: number;
}

/** Personal records */
export interface PersonalRecords {
  bestDailyCharacters: number;
  bestDailyWords: number;
  bestDailyLines: number;
  bestDailyActiveSeconds: number;
  bestStreak: number;
  longestSingleSession: number; // seconds
  bestDailyCharactersDate: string;
  bestDailyWordsDate: string;
  bestStreakEndDate: string;
}

/** User configurable goals */
export interface UserGoals {
  dailyActiveMinutes: number; // default 60
  dailyWords: number; // default 0 (disabled)
  reminderEnabled: boolean; // default true
  pauseThresholdSeconds: number; // default 10
}

/** Full storage schema */
export interface StorageSchema {
  sessions: Record<string, TypingSession[]>; // key = "YYYY-MM-DD"
  streak: StreakState;
  records: PersonalRecords;
  goals: UserGoals;
  installDate: string;
  version: string;
}

/** Delta accumulators for current session */
export interface SessionDelta {
  characters: number;
  words: number;
  lines: number;
}

/** Current session state */
export interface CurrentSessionState {
  id: string;
  startTime: number;
  delta: SessionDelta;
  touchedLanguages: Set<string>;
  touchedFiles: Set<string>;
  isActive: boolean;
}

/** Webview message types */
export interface WebviewMessage {
  type: 'statsUpdate' | 'requestStats' | 'saveGoals' | 'exportStats';
  payload?: unknown;
}

/** Session event data */
export interface SessionClosedEvent {
  session: TypingSession;
  isNewRecord: boolean;
}
