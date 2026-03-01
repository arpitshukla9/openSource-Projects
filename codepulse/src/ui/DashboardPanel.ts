/**
 * DashboardPanel - Manages the webview panel for the dashboard
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { StorageManager } from '../storage/StorageManager';
import { StatsAggregator } from '../core/StatsAggregator';
import { StreakManager } from '../core/StreakManager';
import { RecordKeeper } from '../core/RecordKeeper';
import { UserGoals } from '../models/types';

export class DashboardPanel {
  private panel: vscode.WebviewPanel | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly storageManager: StorageManager,
    private readonly statsAggregator: StatsAggregator,
    private readonly streakManager: StreakManager,
    private readonly recordKeeper: RecordKeeper
  ) {}

  /**
   * Open or focus the dashboard panel
   */
  async open(): Promise<void> {
    if (this.panel) {
      // Panel already exists - bring to focus
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create new panel
    this.panel = vscode.window.createWebviewPanel(
      'codepulse-dashboard',
      'CodePulse Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        enableForms: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'src', 'ui', 'webview')],
      }
    );

    // Set webview content
    this.panel.webview.html = this.getWebviewContent();

    // Handle panel dispose
    this.panel.onDidDispose(() => {
      this.panel = null;
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];
    });

    // Handle messages from webview
    const messageDisposable = this.panel.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
    });

    this.disposables.push(messageDisposable);

    // Send initial data
    this.updateStats();
  }

  /**
   * Update dashboard stats
   */
  updateStats(): void {
    if (!this.panel) {
      return;
    }

    const today = this.statsAggregator.getTodayStats();
    const week = this.statsAggregator.getWeekStats();
    const records = this.recordKeeper.getRecords();
    const streak = this.streakManager.getStreakState();
    const goals = this.storageManager.getGoals();

    const payload = {
      today,
      week,
      records,
      streak,
      goals,
    };

    this.panel.webview.postMessage({
      type: 'statsUpdate',
      payload,
    });
  }

  /**
   * Close the panel
   */
  close(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
  }

  /**
   * Check if panel is open
   */
  isOpen(): boolean {
    return this.panel !== null && !this.panel.visible;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    if (this.panel) {
      this.panel.dispose();
    }
  }

  // ─── Private Helpers ────────────────────────────────

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: unknown): void {
    if (typeof message !== 'object' || message === null) {
      return;
    }

    const msg = message as Record<string, unknown>;
    const type = msg.type;

    switch (type) {
      case 'requestStats':
        this.updateStats();
        break;

      case 'saveGoals':
        this.saveGoals(msg.payload);
        break;

      case 'requestSettings':
        this.sendSettings();
        break;

      case 'exportStats':
        this.exportStats();
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  /**
   * Save goals from webview
   */
  private async saveGoals(payload: unknown): Promise<void> {
    if (typeof payload !== 'object' || payload === null) {
      return;
    }

    const goalData = payload as Record<string, unknown>;

    const goals: UserGoals = {
      dailyActiveMinutes:
        Math.max(5, Math.min(480, Number(goalData.dailyActiveMinutes) || 60)),
      dailyWords: Number(goalData.dailyWords) || 0,
      reminderEnabled: goalData.reminderEnabled !== false,
      pauseThresholdSeconds:
        Math.max(5, Math.min(30, Number(goalData.pauseThresholdSeconds) || 10)),
    };

    try {
      await this.storageManager.setGoals(goals);
      this.statsAggregator.setDailyGoal(goals.dailyActiveMinutes);

      vscode.window.showInformationMessage('✅ Settings saved successfully!');
      this.updateStats();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to save goals: ${message}`);
    }
  }

  /**
   * Send current settings to webview
   */
  private sendSettings(): void {
    const goals = this.storageManager.getGoals();

    if (this.panel) {
      this.panel.webview.postMessage({
        type: 'settingsUpdate',
        payload: goals,
      });
    }
  }

  /**
   * Export stats as JSON
   */
  private async exportStats(): Promise<void> {
    try {
      const json = this.storageManager.exportAsJSON();

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `codepulse-export-${timestamp}.json`;

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(process.env.HOME ? process.env.HOME : '', fileName)),
        filters: {
          JSON: ['json'],
        },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8'));
        vscode.window.showInformationMessage(`✅ Stats exported to ${uri.fsPath}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${message}`);
    }
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(): string {
    const resourcesPath = vscode.Uri.joinPath(this.extensionUri, 'src', 'ui', 'webview');
    const cssPath = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(resourcesPath, 'dashboard.css')
    );
    const jsPath = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(resourcesPath, 'dashboard.js')
    );

    // Generate nonce for CSP
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${cssPath}; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; img-src data:;">
      <title>CodePulse Dashboard</title>
      <link rel="stylesheet" href="${cssPath}" nonce="${nonce}" />
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1 class="logo">🔥 CodePulse</h1>
        </div>
        <div class="header-right">
          <button id="settings-btn" class="icon-btn" title="Open Settings">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.5 1.5H9.5V4C9.5 4.27614 9.27614 4.5 9 4.5C8.72386 4.5 8.5 4.27614 8.5 4V1.5H7.5V4C7.5 4.82843 8.17157 5.5 9 5.5H11C11.8284 5.5 12.5 4.82843 12.5 4V1.5H11.5V4C11.5 4.27614 11.2761 4.5 11 4.5C10.7239 4.5 10.5 4.27614 10.5 4V1.5ZM10 9C10.2761 9 10.5 9.22386 10.5 9.5V14C10.5 14.2761 10.2761 14.5 10 14.5C9.72386 14.5 9.5 14.2761 9.5 14V9.5C9.5 9.22386 9.72386 9 10 9ZM13.5 9.5C13.5 9.22386 13.7239 9 14 9C14.2761 9 14.5 9.22386 14.5 9.5V14C14.5 14.2761 14.2761 14.5 14 14.5C13.7239 14.5 13.5 14.2761 13.5 14V9.5ZM5.5 9.5C5.5 9.22386 5.72386 9 6 9C6.27614 9 6.5 9.22386 6.5 9.5V14C6.5 14.2761 6.27614 14.5 6 14.5C5.72386 14.5 5.5 14.2761 5.5 14V9.5Z" />
            </svg>
          </button>
        </div>
      </div>

      <main>
        <div class="card today-card">
          <div class="card-header">
            <h2>TODAY</h2>
            <p class="date-friendly" id="today-date">Monday, March 1</p>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <label>⏱ Active Time</label>
              <span class="stat-value" id="today-active-time">0m</span>
            </div>
            <div class="stat-item">
              <label>📝 Words</label>
              <span class="stat-value" id="today-words">0</span>
            </div>
          </div>

          <div class="progress-container">
            <div class="progress-label">
              <span id="goal-percentage">0</span>% of <span id="goal-minutes">60</span>min goal
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar" id="goal-progress-bar"></div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <label>🔤 Characters</label>
              <span class="stat-value" id="today-characters">0</span>
            </div>
            <div class="stat-item">
              <label>📄 Lines</label>
              <span class="stat-value" id="today-lines">0</span>
            </div>
          </div>
        </div>

        <div class="streak-row">
          <div class="card streak-card">
            <div class="card-header">
              <h3>🔥 Streak</h3>
            </div>
            <div class="big-stat" id="streak-current">0</div>
            <p class="stat-label">days</p>
          </div>

          <div class="card streak-card">
            <div class="card-header">
              <h3>🧊 Freezes</h3>
            </div>
            <div class="big-stat" id="freezes-available">2</div>
            <p class="stat-label">remaining</p>
          </div>

          <div class="card streak-card">
            <div class="card-header">
              <h3>📅 Total Days</h3>
            </div>
            <div class="big-stat" id="total-days">0</div>
            <p class="stat-label">active</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>📊 Weekly Activity</h3>
          </div>
          <div class="chart-container">
            <canvas id="weeklyChart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🏆 Personal Bests</h3>
          </div>
          <div class="records-list">
            <div class="record-item">
              <span class="record-label">Best Day (words)</span>
              <span class="record-value" id="best-words">0</span>
              <span class="record-date" id="best-words-date">—</span>
            </div>
            <div class="record-item">
              <span class="record-label">Best Day (hours)</span>
              <span class="record-value" id="best-hours">0m</span>
              <span class="record-date" id="best-hours-date">—</span>
            </div>
            <div class="record-item">
              <span class="record-label">Best Streak</span>
              <span class="record-value" id="best-streak">0</span>
              <span class="record-date">days</span>
            </div>
            <div class="record-item">
              <span class="record-label">Longest Session</span>
              <span class="record-value" id="longest-session">0m</span>
              <span class="record-date"></span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>💻 Language Breakdown (This Week)</h3>
          </div>
          <div class="chart-container-small">
            <div id="language-list" class="language-list"></div>
          </div>
        </div>

        <div class="card settings-card" id="settings-panel" style="display: none">
          <div class="card-header">
            <h3>⚙️ Settings</h3>
          </div>

          <div class="setting-group">
            <label for="daily-goal">Daily Goal (minutes)</label>
            <input type="number" id="daily-goal" min="5" max="480" value="60" />
          </div>

          <div class="setting-group">
            <label for="pause-threshold">Pause Threshold (seconds)</label>
            <input type="range" id="pause-threshold" min="5" max="30" value="10" />
            <span class="slider-value" id="pause-threshold-value">10s</span>
          </div>

          <div class="setting-group">
            <label for="enable-freeze-reminder">
              <input type="checkbox" id="enable-freeze-reminder" checked />
              Enable Streak Freeze Reminder
            </label>
          </div>

          <button id="save-goals-btn" class="btn btn-primary">Save Settings</button>
        </div>
      </main>

      <div class="footer">
        <p>CodePulse • 100% Local • Zero Telemetry</p>
      </div>

      <link rel="stylesheet" href="${cssPath}" nonce="${nonce}" />
      <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
      <script nonce="${nonce}" src="${jsPath}"></script>
    </body>
    </html>`;
  }

  /**
   * Generate a random nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
