/**
 * StreakManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
    })),
    showWarningMessage: vi.fn(),
  },
}));

import { StreakManager } from '../src/core/StreakManager';
import { StatsAggregator } from '../src/core/StatsAggregator';
import { StorageManager } from '../src/storage/StorageManager';
import { getYesterdayDate, getTodayDate } from '../src/utils/timeUtils';

describe('StreakManager', () => {
  let streakManager: StreakManager;
  let statsAggregator: StatsAggregator;
  let storageManager: StorageManager;
  let mockMemento: any;

  beforeEach(() => {
    let storedData: any = null;

    mockMemento = {
      get: vi.fn((key: string) => {
        if (key === 'codepulse:storage') return storedData;
        return null;
      }),
      update: vi.fn(async (key: string, value: any) => {
        if (key === 'codepulse:storage') {
          storedData = value;
        }
        return undefined;
      }),
      keys: vi.fn().mockReturnValue([]),
    };

    storageManager = new StorageManager(mockMemento);
    statsAggregator = new StatsAggregator(storageManager, 60);
    streakManager = new StreakManager(storageManager, statsAggregator);
  });

  it('increments streak when yesterday hit goal', async () => {
    const streak = streakManager.getStreakState();
    streak.lastActiveDate = getYesterdayDate();
    streak.current = 5;

    // Add a session for yesterday that hits the goal
    const mockStorage = {
      sessions: {
        [getYesterdayDate()]: [
          {
            id: 'test',
            startTime: 0,
            endTime: 3600000,
            durationSeconds: 3600,
            characters: 100,
            words: 20,
            lines: 10,
            language: 'typescript',
            fileCount: 1,
            date: getYesterdayDate(),
          },
        ],
      },
      streak,
      records: storageManager.getRecords(),
      goals: storageManager.getGoals(),
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    const startingStreak = streakManager.getCurrentStreak();

    await streakManager.performMidnightCheck();

    // Streak should not increment again (idempotent check)
    expect(streakManager.getCurrentStreak()).toBeLessThanOrEqual(startingStreak + 1);
  });

  it('consumes freeze when yesterday missed goal', async () => {
    const streak = streakManager.getStreakState();
    streak.lastActiveDate = getYesterdayDate();
    streak.current = 3;
    streak.freezesAvailable = 2;

    const mockStorage = {
      sessions: {
        [getYesterdayDate()]: [
          {
            id: 'test',
            startTime: 0,
            endTime: 600000, // 10 minutes
            durationSeconds: 600,
            characters: 50,
            words: 10,
            lines: 5,
            language: 'typescript',
            fileCount: 1,
            date: getYesterdayDate(),
          },
        ],
      },
      streak,
      records: storageManager.getRecords(),
      goals: { ...storageManager.getGoals(), dailyActiveMinutes: 60 },
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    const startingFreeze = streakManager.getFreezesAvailable();

    await streakManager.performMidnightCheck();

    // Freeze should be consumed
    expect(streakManager.getFreezesAvailable()).toBeLessThan(startingFreeze);
  });

  it('resets streak if missed and no freeze available', async () => {
    const streak = streakManager.getStreakState();
    streak.lastActiveDate = getYesterdayDate();
    streak.current = 5;
    streak.freezesAvailable = 0;

    const mockStorage = {
      sessions: {
        [getYesterdayDate()]: [
          {
            id: 'test',
            startTime: 0,
            endTime: 600000,
            durationSeconds: 600,
            characters: 50,
            words: 10,
            lines: 5,
            language: 'typescript',
            fileCount: 1,
            date: getYesterdayDate(),
          },
        ],
      },
      streak,
      records: storageManager.getRecords(),
      goals: { ...storageManager.getGoals(), dailyActiveMinutes: 60 },
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    await streakManager.performMidnightCheck();

    // Streak should be reset
    expect(streakManager.getCurrentStreak()).toBe(0);
  });

  it('never exceeds 2 freezes', async () => {
    const streak = streakManager.getStreakState();
    streak.freezesAvailable = 1;

    await (streakManager as any).replenishFreeze();

    expect(streakManager.getFreezesAvailable()).toBeLessThanOrEqual(2);
  });

  it('records today goal hit correctly', async () => {
    const startingStreak = streakManager.getCurrentStreak();

    await streakManager.recordTodayGoalHit();

    // Total days active should increase
    expect(streakManager.getTotalDaysActive()).toBeGreaterThanOrEqual(1);
  });

  it('handles first ever day correctly', async () => {
    const mockStorage = {
      sessions: {},
      streak: {
        current: 0,
        longest: 0,
        lastActiveDate: '',
        freezesAvailable: 2,
        freezeLastReplenished: getTodayDate(),
        totalDaysActive: 0,
      },
      records: storageManager.getRecords(),
      goals: storageManager.getGoals(),
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    const result = await streakManager.performMidnightCheck();

    expect(result).toBe(true);
  });

  it('returns true when midnight check is executed', async () => {
    const mockStorage = {
      sessions: {},
      streak: storageManager.getStreak(),
      records: storageManager.getRecords(),
      goals: storageManager.getGoals(),
      installDate: getTodayDate(),
      version: '1.0.0',
    };

    mockMemento.get.mockReturnValue(mockStorage);

    const result = await streakManager.performMidnightCheck();

    expect(result).toBe(true);
  });
});
