/**
 * RecordKeeper - Tracks personal best records
 */

import * as vscode from 'vscode';
import { StorageManager } from '../storage/StorageManager';
import { StatsAggregator } from './StatsAggregator';
import { TypingSession, PersonalRecords } from '../models/types';
import { formatDuration, getTodayDate } from '../utils/timeUtils';

export class RecordKeeper {
  private outputChannel: vscode.OutputChannel;

  constructor(
    private readonly storageManager: StorageManager,
    private readonly statsAggregator: StatsAggregator
  ) {
    this.outputChannel = vscode.window.createOutputChannel('CodePulse');
  }

  /**
   * Check session and day stats against records, update if beaten
   */
  async checkAndUpdateRecords(session: TypingSession): Promise<boolean> {
    let newRecordFound = false;
    const records = this.storageManager.getRecords();

    // Check session-level record
    if (session.durationSeconds > records.longestSingleSession) {
      records.longestSingleSession = session.durationSeconds;
      this.showRecordNotification(
        'Longest Session',
        formatDuration(session.durationSeconds),
        formatDuration(records.longestSingleSession)
      );
      newRecordFound = true;
    }

    // Check daily stats
    const todayStats = this.statsAggregator.getTodayStats();

    if (todayStats.totalCharacters > records.bestDailyCharacters) {
      records.bestDailyCharacters = todayStats.totalCharacters;
      records.bestDailyCharactersDate = getTodayDate();
      this.showRecordNotification(
        'Most Characters (day)',
        this.formatNumber(todayStats.totalCharacters),
        this.formatNumber(records.bestDailyCharacters)
      );
      newRecordFound = true;
    }

    if (todayStats.totalWords > records.bestDailyWords) {
      records.bestDailyWords = todayStats.totalWords;
      records.bestDailyWordsDate = getTodayDate();
      this.showRecordNotification(
        'Most Words (day)',
        this.formatNumber(todayStats.totalWords),
        this.formatNumber(records.bestDailyWords)
      );
      newRecordFound = true;
    }

    if (todayStats.totalLines > records.bestDailyLines) {
      records.bestDailyLines = todayStats.totalLines;
      this.showRecordNotification(
        'Most Lines (day)',
        this.formatNumber(todayStats.totalLines),
        this.formatNumber(records.bestDailyLines)
      );
      newRecordFound = true;
    }

    if (todayStats.totalActiveSeconds > records.bestDailyActiveSeconds) {
      records.bestDailyActiveSeconds = todayStats.totalActiveSeconds;
      this.showRecordNotification(
        'Longest Active Time (day)',
        formatDuration(todayStats.totalActiveSeconds),
        formatDuration(records.bestDailyActiveSeconds)
      );
      newRecordFound = true;
    }

    if (newRecordFound) {
      await this.storageManager.setRecords(records);
    }

    return newRecordFound;
  }

  /**
   * Check streak record
   */
  async updateStreakRecord(newStreak: number): Promise<void> {
    const records = this.storageManager.getRecords();

    if (newStreak > records.bestStreak) {
      records.bestStreak = newStreak;
      records.bestStreakEndDate = getTodayDate();

      this.showRecordNotification(
        'Longest Streak',
        `${newStreak} days 🔥`,
        `${records.bestStreak} days 🔥`
      );

      await this.storageManager.setRecords(records);
    }
  }

  /**
   * Get all records
   */
  getRecords(): PersonalRecords {
    return this.storageManager.getRecords();
  }

  /**
   * Get formatted records summary
   */
  getFormattedSummary(): string {
    const records = this.storageManager.getRecords();

    return `
🏆 PERSONAL RECORDS
────────────────────────────
📝 Most Words (day): ${this.formatNumber(records.bestDailyWords)} (${records.bestDailyWordsDate})
🔤 Most Characters: ${this.formatNumber(records.bestDailyCharacters)} (${records.bestDailyCharactersDate})
📄 Most Lines: ${this.formatNumber(records.bestDailyLines)}
⏱ Longest Active: ${formatDuration(records.bestDailyActiveSeconds)}
🔥 Longest Streak: ${records.bestStreak} days (${records.bestStreakEndDate})
⏲ Longest Session: ${formatDuration(records.longestSingleSession)}
    `.trim();
  }

  // ─── Private Helpers ────────────────────────────────

  /**
   * Check if current time is near end of day (11:45 PM)
   */
  private isEndOfDay(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Show notifications between 11:45 PM (23:45) and midnight
    return hours === 23 && minutes >= 45;
  }

  /**
   * Show a trophy notification for new personal best
   * Only displays popup at 11:45 PM, but always logs to output channel
   */
  private showRecordNotification(metric: string, current: string, _previous: string): void {
    const message = `🏆 New Personal Best! ${metric}: ${current}`;
    
    // Only show popup notification near end of day
    if (this.isEndOfDay()) {
      vscode.window.showInformationMessage(message);
    }

    // Always log to output channel for reference
    this.outputChannel.appendLine(
      `[${new Date().toISOString()}] 🏆 Record: ${metric} = ${current}`
    );
  }

  /**
   * Format number with thousands separator
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }
}
