/**
 * StatsAggregator Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsAggregator } from '../src/core/StatsAggregator';
import { StorageManager } from '../src/storage/StorageManager';
import { getTodayDate, getDateNDaysAgo } from '../src/utils/timeUtils';

describe('StatsAggregator', () => {
  let aggregator: StatsAggregator;
  let storageManager: StorageManager;
  let mockMemento: any;

  beforeEach(() => {
    mockMemento = {
      get: vi.fn().mockReturnValue(null),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
    };

    storageManager = new StorageManager(mockMemento);
    aggregator = new StatsAggregator(storageManager, 60);
  });

  it('returns zero stats for day with no sessions', () => {
    const stats = aggregator.getDayStats(getTodayDate());

    expect(stats.date).toBe(getTodayDate());
    expect(stats.totalActiveSeconds).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.totalWords).toBe(0);
    expect(stats.totalLines).toBe(0);
    expect(stats.sessionCount).toBe(0);
    expect(stats.goalHit).toBe(false);
  });

  it('correctly sums multiple sessions in one day', () => {
    const mockStorage = {
      sessions: {
        [getTodayDate()]: [
          {
            id: 'session1',
            startTime: 0,
            endTime: 1800000,
            durationSeconds: 1800,
            characters: 100,
            words: 20,
            lines: 10,
            language: 'typescript',
            fileCount: 1,
            date: getTodayDate(),
          },
          {
            id: 'session2',
            startTime: 1800000,
            endTime: 3600000,
            durationSeconds: 1800,
            characters: 150,
            words: 30,
            lines: 15,
            language: 'python',
            fileCount: 1,
            date: getTodayDate(),
          },
        ],
      },
      streak: storageManager.getStreak(),
      records: storageManager.getRecords(),
      goals: storageManager.getGoals(),
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    const stats = aggregator.getDayStats(getTodayDate());

    expect(stats.totalActiveSeconds).toBe(3600);
    expect(stats.totalCharacters).toBe(250);
    expect(stats.totalWords).toBe(50);
    expect(stats.totalLines).toBe(25);
    expect(stats.sessionCount).toBe(2);
  });

  it('getWeekStats returns exactly 7 entries', () => {
    const weekStats = aggregator.getWeekStats();

    expect(weekStats).toHaveLength(7);
  });

  it('includes days with zero activity in week array', () => {
    const weekStats = aggregator.getWeekStats();

    // At least one day should have zero sessions (today likely)
    const hasZeroDay = weekStats.some((day) => day.sessionCount === 0);

    expect(hasZeroDay).toBe(true);
  });

  it('goalHit is true when activeSeconds >= goal', () => {
    const mockStorage = {
      sessions: {
        [getTodayDate()]: [
          {
            id: 'session1',
            startTime: 0,
            endTime: 3600 * 1000 * 1.5, // 1.5 hours = 5400 seconds
            durationSeconds: 5400,
            characters: 100,
            words: 20,
            lines: 10,
            language: 'typescript',
            fileCount: 1,
            date: getTodayDate(),
          },
        ],
      },
      streak: storageManager.getStreak(),
      records: storageManager.getRecords(),
      goals: { ...storageManager.getGoals(), dailyActiveMinutes: 60 }, // 3600 seconds
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);
    aggregator.setDailyGoal(60);

    const stats = aggregator.getDayStats(getTodayDate());

    expect(stats.goalHit).toBe(true);
  });

  it('goalHit is false when activeSeconds < goal', () => {
    const mockStorage = {
      sessions: {
        [getTodayDate()]: [
          {
            id: 'session1',
            startTime: 0,
            endTime: 1800000, // 30 minutes
            durationSeconds: 1800,
            characters: 100,
            words: 20,
            lines: 10,
            language: 'typescript',
            fileCount: 1,
            date: getTodayDate(),
          },
        ],
      },
      streak: storageManager.getStreak(),
      records: storageManager.getRecords(),
      goals: { ...storageManager.getGoals(), dailyActiveMinutes: 60 },
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);
    aggregator.setDailyGoal(60);

    const stats = aggregator.getDayStats(getTodayDate());

    expect(stats.goalHit).toBe(false);
  });

  it('getTodayStats works correctly', () => {
    const today = aggregator.getTodayStats();

    expect(today.date).toBe(getTodayDate());
  });

  it('isTodayGoalHit returns boolean', () => {
    const result = aggregator.isTodayGoalHit();

    expect(typeof result).toBe('boolean');
  });

  it('getTodayGoalProgress returns valid progress object', () => {
    const progress = aggregator.getTodayGoalProgress();

    expect(progress.current).toBeGreaterThanOrEqual(0);
    expect(progress.goal).toBeGreaterThan(0);
    expect(progress.percentage).toBeGreaterThanOrEqual(0);
    expect(progress.percentage).toBeLessThanOrEqual(100);
  });

  it('getTopLanguages returns limited results', () => {
    const mockStorage = {
      sessions: {
        [getDateNDaysAgo(0)]: [
          {
            id: 'session1',
            startTime: 0,
            endTime: 3600000,
            durationSeconds: 3600,
            characters: 100,
            words: 20,
            lines: 10,
            language: 'typescript',
            fileCount: 1,
            date: getDateNDaysAgo(0),
          },
        ],
      },
      streak: storageManager.getStreak(),
      records: storageManager.getRecords(),
      goals: storageManager.getGoals(),
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    const topLangs = aggregator.getTopLanguages(3);

    expect(topLangs.length).toBeLessThanOrEqual(3);
  });
});
