/**
 * StatusBarItem - Displays live stats in VS Code status bar
 */

import * as vscode from 'vscode';
import { StatsAggregator } from '../core/StatsAggregator';
import { DayStats } from '../models/types';
import { formatDuration } from '../utils/timeUtils';
import { formatNumber } from '../utils/textUtils';

export class StatusBarItemManager {
  private statusBar: vscode.StatusBarItem;
  private updateInterval: NodeJS.Timeout | null = null;
  private showWordsInStatusBar: boolean = true;

  constructor(private readonly statsAggregator: StatsAggregator) {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBar.command = 'codepulse.openDashboard';
    this.statusBar.show();

    this.startUpdateInterval();
  }

  /**
   * Set whether to show words in status bar
   */
  setShowWordsInStatusBar(show: boolean): void {
    this.showWordsInStatusBar = show;
    this.update();
  }

  /**
   * Update status bar display
   */
  update(): void {
    const today = this.statsAggregator.getTodayStats();
    const goal = this.statsAggregator.getTodayGoalProgress();
    const current = this.statsAggregator.getCurrentSessionLive(0, {
      characters: 0,
      words: 0,
      lines: 0,
    });

    const isActive = current.totalActiveSeconds > 0; // Simplified check
    const icon = goal.percentage >= 100 ? '✅' : isActive ? '⚡' : '💤';
    const streak = today.sessionCount > 0 ? ' •' : '';
    const streakNum = today.sessionCount > 0 ? ` 🔥 ${today.sessionCount}` : '';

    let text = `${icon} ${formatDuration(today.totalActiveSeconds)}`;

    if (this.showWordsInStatusBar) {
      text += ` • ${formatNumber(today.totalWords)} words`;
    }

    text += streak + streakNum;

    this.statusBar.text = text;
    this.statusBar.tooltip = this.getTooltip(today, goal);
  }

  /**
   * Get tooltip text
   */
  private getTooltip(today: DayStats, goal: { goal: number; current: number; percentage: number; formatted: string }): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

  const goalStatusEmoji = goal.percentage >= 100 ? '✅' : '⏳';

    md.appendMarkdown(`**CodePulse — Today's Stats**\n\n`);
    md.appendMarkdown(`⏱ **Active Time:** ${formatDuration(today.totalActiveSeconds)}\n`);
    md.appendMarkdown(
      `${goalStatusEmoji} **Goal:** ${goal.goal / 60} minutes\n`
    );
    md.appendMarkdown(`📝 **Words:** ${formatNumber(today.totalWords)}\n`);
    md.appendMarkdown(`🔤 **Characters:** ${formatNumber(today.totalCharacters)}\n`);
    md.appendMarkdown(`📄 **Lines:** ${formatNumber(today.totalLines)}\n\n`);
    md.appendMarkdown(`*Click to open dashboard*`);

    return md;
  }

  /**
   * Start the update interval
   */
  private startUpdateInterval(): void {
    // Update every 1 second when extension is active
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);
  }

  /**
   * Stop the update interval (on deactivation)
   */
  stopUpdateInterval(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Dispose of status bar
   */
  dispose(): void {
    this.stopUpdateInterval();
    this.statusBar.dispose();
  }
}
