/**
 * StatsAggregator - Rolls up sessions into daily and weekly stats
 */

import { StorageManager } from '../storage/StorageManager';
import { DayStats, SessionDelta } from '../models/types';
import {
  getTodayDate,
  getLastSevenDays,
  getLastThirtyDays,
  formatDuration,
} from '../utils/timeUtils';

export class StatsAggregator {
  constructor(private readonly storageManager: StorageManager, private dailyGoalMinutes: number) {}

  /**
   * Update daily goal
   */
  setDailyGoal(minutes: number): void {
    this.dailyGoalMinutes = Math.max(5, Math.min(480, minutes));
  }

  /**
   * Calculate stats for a specific day
   */
  getDayStats(dateStr: string): DayStats {
    const sessions = this.storageManager.getSessionsForDate(dateStr);

    let totalActiveSeconds = 0;
    let totalCharacters = 0;
    let totalWords = 0;
    let totalLines = 0;
    const languageBreakdown: Record<string, number> = {};

    for (const session of sessions) {
      totalActiveSeconds += session.durationSeconds;
      totalCharacters += session.characters;
      totalWords += session.words;
      totalLines += session.lines;

      const lang = session.language;
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + session.durationSeconds;
    }

    const goalThresholdSeconds = this.dailyGoalMinutes * 60;
    const goalHit = totalActiveSeconds >= goalThresholdSeconds;

    return {
      date: dateStr,
      totalActiveSeconds,
      totalCharacters,
      totalWords,
      totalLines,
      sessionCount: sessions.length,
      languageBreakdown,
      goalHit,
    };
  }

  /**
   * Get stats for today
   */
  getTodayStats(): DayStats {
    return this.getDayStats(getTodayDate());
  }

  /**
   * Get stats for the last 7 days (array of 7 entries)
   */
  getWeekStats(): DayStats[] {
    const dates = getLastSevenDays();
    return dates.map((date) => this.getDayStats(date));
  }

  /**
   * Get stats for the last 30 days
   */
  getMonthStats(): DayStats[] {
    const dates = getLastThirtyDays();
    return dates.map((date) => this.getDayStats(date));
  }

  /**
   * Get current live session stats (partial, from SessionEngine)
   */
  getCurrentSessionLive(sessionStartTime: number, delta: SessionDelta): DayStats {
    const now = Date.now();
    const elapsedSeconds = Math.round((now - sessionStartTime) / 1000);

    return {
      date: getTodayDate(),
      totalActiveSeconds: elapsedSeconds,
      totalCharacters: delta.characters,
      totalWords: delta.words,
      totalLines: delta.lines,
      sessionCount: 1,
      languageBreakdown: {},
      goalHit: false,
    };
  }

  /**
   * Get combined stats for today + current session
   */
  getTodayWithCurrentSession(sessionStartTime: number, delta: SessionDelta): DayStats {
    const todayStats = this.getTodayStats();
    const liveStats = this.getCurrentSessionLive(sessionStartTime, delta);

    const totalActiveSeconds = todayStats.totalActiveSeconds + liveStats.totalActiveSeconds;

    const combined: DayStats = {
      date: todayStats.date,
      totalActiveSeconds,
      totalCharacters: todayStats.totalCharacters + liveStats.totalCharacters,
      totalWords: todayStats.totalWords + liveStats.totalWords,
      totalLines: todayStats.totalLines + liveStats.totalLines,
      sessionCount: todayStats.sessionCount + liveStats.sessionCount,
      languageBreakdown: {
        ...todayStats.languageBreakdown,
        ...liveStats.languageBreakdown,
      },
      goalHit: totalActiveSeconds >= this.dailyGoalMinutes * 60,
    };

    return combined;
  }

  /**
   * Get summary stats for a date range
   */
  getSummaryStats(
    startDate: string,
    endDate: string
  ): {
    totalSessions: number;
    totalActiveSeconds: number;
    totalCharacters: number;
    totalWords: number;
    totalLines: number;
    goalsHit: number;
    averageSessionDuration: number;
  } {
    const sessions = this.storageManager.getSessionsInRange(startDate, endDate);

    let totalActiveSeconds = 0;
    let totalCharacters = 0;
    let totalWords = 0;
    let totalLines = 0;
    const daysWithGoal = new Set<string>();

    for (const session of sessions) {
      totalActiveSeconds += session.durationSeconds;
      totalCharacters += session.characters;
      totalWords += session.words;
      totalLines += session.lines;
    }

    // Count days that hit goals
    const dayStats = this.getWeekStats();
    for (const day of dayStats) {
      if (day.goalHit) {
        daysWithGoal.add(day.date);
      }
    }

    const avgSessionDuration = sessions.length > 0 ? totalActiveSeconds / sessions.length : 0;

    return {
      totalSessions: sessions.length,
      totalActiveSeconds,
      totalCharacters,
      totalWords,
      totalLines,
      goalsHit: daysWithGoal.size,
      averageSessionDuration: Math.round(avgSessionDuration),
    };
  }

  /**
   * Get top languages by active time (last 7 days)
   */
  getTopLanguages(limit: number = 5): Array<{ language: string; seconds: number }> {
    const weekStats = this.getWeekStats();
    const languageTotals: Record<string, number> = {};

    for (const day of weekStats) {
      for (const [language, seconds] of Object.entries(day.languageBreakdown)) {
        languageTotals[language] = (languageTotals[language] || 0) + seconds;
      }
    }

    return Object.entries(languageTotals)
      .map(([language, seconds]) => ({ language, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, limit);
  }

  /**
   * Check if today's goal has been hit
   */
  isTodayGoalHit(): boolean {
    return this.getTodayStats().goalHit;
  }

  /**
   * Get formatted progress towards today's goal
   */
  getTodayGoalProgress(): {
    current: number;
    goal: number;
    percentage: number;
    formatted: string;
  } {
    const today = this.getTodayStats();
    const current = today.totalActiveSeconds;
    const goal = this.dailyGoalMinutes * 60;
    const percentage = Math.min(100, Math.round((current / goal) * 100));

    return {
      current,
      goal,
      percentage,
      formatted: `${formatDuration(current)} / ${formatDuration(goal)} (${percentage}%)`,
    };
  }
}
