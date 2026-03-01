/**
 * StreakManager - Manages streaks, freezes, and goal tracking
 */

import * as vscode from 'vscode';
import { StorageManager } from '../storage/StorageManager';
import { StatsAggregator } from './StatsAggregator';
import { StreakState } from '../models/types';
import { getTodayDate, getYesterdayDate, daysBetween } from '../utils/timeUtils';

export class StreakManager {
  private lastMidnightCheckDate: string = '';
  private outputChannel: vscode.OutputChannel;

  constructor(
    private readonly storageManager: StorageManager,
    private readonly statsAggregator: StatsAggregator
  ) {
    this.outputChannel = vscode.window.createOutputChannel('CodePulse');
  }

  /**
   * Perform midnight check (called on activation and periodically)
   * Returns true if streak logic was executed
   */
  async performMidnightCheck(): Promise<boolean> {
    const today = getTodayDate();

    // Only run once per day
    if (this.lastMidnightCheckDate === today) {
      return false;
    }

    this.lastMidnightCheckDate = today;

    const streak = this.storageManager.getStreak();
    const yesterday = getYesterdayDate();

    // Check if yesterday was active and hit the goal
    const yesterdayStats = this.statsAggregator.getDayStats(yesterday);
    const yesterdayGoalHit = yesterdayStats.goalHit;

    // Check if streak was already incremented (idempotent)
    const daysSinceLastActive = daysBetween(streak.lastActiveDate, yesterday);

    if (yesterdayGoalHit && daysSinceLastActive === 1) {
      // Streak already incremented, nothing to do
      return true;
    }

    if (yesterdayGoalHit && daysSinceLastActive > 1) {
      // We had activity but streak wasn't updated (shouldn't happen)
      // Increment streak
      streak.current += 1;
      streak.longest = Math.max(streak.longest, streak.current);
      streak.lastActiveDate = yesterday;
      streak.totalDaysActive += 1;
      await this.storageManager.setStreak(streak);
      return true;
    }

    if (!yesterdayGoalHit && streak.lastActiveDate === yesterday) {
      // Yesterday was tracked but missed goal - check for freeze
      if (streak.freezesAvailable > 0) {
        // Consume freeze
        streak.freezesAvailable -= 1;
        await this.storageManager.setStreak(streak);

        vscode.window.showWarningMessage(
          `❄️ Streak freeze used! You have ${streak.freezesAvailable} freeze(s) remaining.`
        );
        this.outputChannel.appendLine(
          `[${new Date().toISOString()}] Streak freeze consumed. Remaining: ${streak.freezesAvailable}`
        );

        return true;
      } else {
        // No freeze available - reset streak
        streak.current = 0;
        await this.storageManager.setStreak(streak);

        vscode.window.showWarningMessage(
          '🔥 Oops! Your streak has been reset. No freezes available.'
        );
        this.outputChannel.appendLine(
          `[${new Date().toISOString()}] Streak reset due to missed goal and no freezes.`
        );

        return true;
      }
    }

    // Replenish freezes if 7 days have passed since last replenishment
    await this.replenishFreeze();

    return true;
  }

  /**
   * Record that today's goal was hit
   */
  async recordTodayGoalHit(): Promise<void> {
    const streak = this.storageManager.getStreak();
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    // If this is the first hit for today
    if (streak.lastActiveDate !== today) {
      streak.lastActiveDate = today;

      // Check if we should increment streak
      const daysSinceLastActive = daysBetween(streak.lastActiveDate, yesterday);

      if (daysSinceLastActive === 1) {
        // Consecutive day - increment streak
        streak.current += 1;
        streak.longest = Math.max(streak.longest, streak.current);
        streak.totalDaysActive += 1;

        this.outputChannel.appendLine(
          `[${new Date().toISOString()}] Streak incremented to ${streak.current}`
        );
      } else if (daysSinceLastActive > 1) {
        // Gap detected, but still need to increment (will happen at midnight check)
        // For now, just set last active
      } else {
        // First ever active day or same day - don't increment yet
        streak.totalDaysActive = Math.max(streak.totalDaysActive, 1);
      }

      await this.storageManager.setStreak(streak);
    }
  }

  /**
   * Get current streak
   */
  getCurrentStreak(): number {
    return this.storageManager.getStreak().current;
  }

  /**
   * Get longest streak
   */
  getLongestStreak(): number {
    return this.storageManager.getStreak().longest;
  }

  /**
   * Get available freezes
   */
  getFreezesAvailable(): number {
    return this.storageManager.getStreak().freezesAvailable;
  }

  /**
   * Get total days active
   */
  getTotalDaysActive(): number {
    return this.storageManager.getStreak().totalDaysActive;
  }

  /**
   * Get full streak state
   */
  getStreakState(): StreakState {
    return this.storageManager.getStreak();
  }

  // ─── Private Helpers ────────────────────────────────

  /**
   * Replenish freezes if 7+ days since last replenishment
   */
  private async replenishFreeze(): Promise<void> {
    const streak = this.storageManager.getStreak();
    const today = getTodayDate();

    const daysSinceReplenish = daysBetween(streak.freezeLastReplenished, today);

    if (daysSinceReplenish >= 7) {
      const previousFreezes = streak.freezesAvailable;
      streak.freezesAvailable = Math.min(streak.freezesAvailable + 1, 2);
      streak.freezeLastReplenished = today;

      if (streak.freezesAvailable > previousFreezes) {
        await this.storageManager.setStreak(streak);
        this.outputChannel.appendLine(
          `[${new Date().toISOString()}] Freeze replenished. Available: ${streak.freezesAvailable}`
        );
      }
    }
  }
}
