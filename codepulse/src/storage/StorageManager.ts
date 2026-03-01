/**
 * StorageManager - Handles all globalState persistence
 */

import * as vscode from 'vscode';
import {
  StorageSchema,
  TypingSession,
  StreakState,
  PersonalRecords,
  UserGoals,
} from '../models/types';
import { getTodayDate, isOlderThanDays } from '../utils/timeUtils';

const STORAGE_KEY = 'codepulse:storage';
const CURRENT_VERSION = '1.0.0';

export class StorageManager {
  constructor(private readonly globalState: vscode.Memento) {}

  /**
   * Get or initialize the entire storage schema
   */
  getStorage(): StorageSchema {
    try {
      const stored = this.globalState.get<StorageSchema>(STORAGE_KEY);
      if (stored && this.isValidSchema(stored)) {
        return stored;
      }
      return this.getDefaultStorage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to read storage:', message);
      return this.getDefaultStorage();
    }
  }

  /**
   * Save entire storage schema
   */
  async saveStorage(storage: StorageSchema): Promise<void> {
    try {
      await this.globalState.update(STORAGE_KEY, storage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to save storage:', message);
      throw err;
    }
  }

  /**
   * Get sessions for a specific date
   */
  getSessionsForDate(dateStr: string): TypingSession[] {
    const storage = this.getStorage();
    return storage.sessions[dateStr] || [];
  }

  /**
   * Add a session to storage
   */
  async addSession(session: TypingSession): Promise<void> {
    const storage = this.getStorage();
    if (!storage.sessions[session.date]) {
      storage.sessions[session.date] = [];
    }
    storage.sessions[session.date].push(session);
    await this.saveStorage(storage);
  }

  /**
   * Get all sessions in date range (inclusive)
   */
  getSessionsInRange(startDate: string, endDate: string): TypingSession[] {
    const storage = this.getStorage();
    const sessions: TypingSession[] = [];

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    for (const [dateStr, daySessions] of Object.entries(storage.sessions)) {
      const dateMs = new Date(dateStr).getTime();
      if (dateMs >= startMs && dateMs <= endMs) {
        sessions.push(...daySessions);
      }
    }

    return sessions;
  }

  /**
   * Get streak state
   */
  getStreak(): StreakState {
    return this.getStorage().streak;
  }

  /**
   * Update streak state
   */
  async setStreak(streak: StreakState): Promise<void> {
    const storage = this.getStorage();
    storage.streak = streak;
    await this.saveStorage(storage);
  }

  /**
   * Get personal records
   */
  getRecords(): PersonalRecords {
    return this.getStorage().records;
  }

  /**
   * Update personal records
   */
  async setRecords(records: PersonalRecords): Promise<void> {
    const storage = this.getStorage();
    storage.records = records;
    await this.saveStorage(storage);
  }

  /**
   * Get user goals
   */
  getGoals(): UserGoals {
    return this.getStorage().goals;
  }

  /**
   * Update user goals
   */
  async setGoals(goals: UserGoals): Promise<void> {
    const storage = this.getStorage();
    storage.goals = goals;
    await this.saveStorage(storage);
  }

  /**
   * Prune old sessions (older than 90 days)
   */
  async pruneOldSessions(): Promise<void> {
    const storage = this.getStorage();

    for (const dateStr of Object.keys(storage.sessions)) {
      if (isOlderThanDays(dateStr, 90)) {
        delete storage.sessions[dateStr];
      }
    }

    await this.saveStorage(storage);
  }

  /**
   * Export storage as JSON string
   */
  exportAsJSON(): string {
    const storage = this.getStorage();
    return JSON.stringify(storage, null, 2);
  }

  /**
   * Clear all storage (for reset/testing)
   */
  async clear(): Promise<void> {
    await this.globalState.update(STORAGE_KEY, this.getDefaultStorage());
  }

  /**
   * Get all stored data in a summary format
   */
  getSummary(): {
    totalSessions: number;
    totalDays: number;
    dateRange: { start: string; end: string } | null;
  } {
    const storage = this.getStorage();
    const dates = Object.keys(storage.sessions).sort();

    let totalSessions = 0;
    for (const sessions of Object.values(storage.sessions)) {
      totalSessions += sessions.length;
    }

    return {
      totalSessions,
      totalDays: dates.length,
      dateRange:
        dates.length > 0
          ? { start: dates[0], end: dates[dates.length - 1] }
          : null,
    };
  }

  // ─── Private Helpers ────────────────────────────────

  /**
   * Validate if storage object matches schema
   */
  private isValidSchema(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) return false;

    const storage = obj as Record<string, unknown>;

    return (
      typeof storage.sessions === 'object' &&
      storage.sessions !== null &&
      typeof storage.streak === 'object' &&
      storage.streak !== null &&
      typeof storage.records === 'object' &&
      storage.records !== null &&
      typeof storage.goals === 'object' &&
      storage.goals !== null &&
      typeof storage.installDate === 'string' &&
      typeof storage.version === 'string'
    );
  }

  /**
   * Get default/empty storage schema
   */
  private getDefaultStorage(): StorageSchema {
    return {
      sessions: {},
      streak: {
        current: 0,
        longest: 0,
        lastActiveDate: '',
        freezesAvailable: 2,
        freezeLastReplenished: getTodayDate(),
        totalDaysActive: 0,
      },
      records: {
        bestDailyCharacters: 0,
        bestDailyWords: 0,
        bestDailyLines: 0,
        bestDailyActiveSeconds: 0,
        bestStreak: 0,
        longestSingleSession: 0,
        bestDailyCharactersDate: '',
        bestDailyWordsDate: '',
        bestStreakEndDate: '',
      },
      goals: {
        dailyActiveMinutes: 60,
        dailyWords: 1000,
        reminderEnabled: true,
        pauseThresholdSeconds: 10,
      },
      installDate: getTodayDate(),
      version: CURRENT_VERSION,
    };
  }
}
