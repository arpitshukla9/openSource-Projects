/**
 * CodePulse - Main Extension Entry Point
 */

import * as vscode from 'vscode';
import { StorageManager } from './storage/StorageManager';
import { SessionEngine } from './core/SessionEngine';
import { StatsAggregator } from './core/StatsAggregator';
import { StreakManager } from './core/StreakManager';
import { RecordKeeper } from './core/RecordKeeper';
import { StatusBarItemManager } from './ui/StatusBarItem';
import { DashboardPanel } from './ui/DashboardPanel';
import { getTodayDate } from './utils/timeUtils';

let extension: CodePulseExtension | null = null;
let outputChannel: vscode.OutputChannel;

/**
 * Main extension class
 */
class CodePulseExtension {
  private storageManager: StorageManager;
  private sessionEngine: SessionEngine;
  private statsAggregator: StatsAggregator;
  private streakManager: StreakManager;
  private recordKeeper: RecordKeeper;
  private statusBarManager: StatusBarItemManager;
  private dashboardPanel: DashboardPanel;
  private disposables: vscode.Disposable[] = [];
  private midnightCheckInterval: NodeJS.Timeout | null = null;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this.storageManager = new StorageManager(_context.globalState);
    this.sessionEngine = new SessionEngine(
      this.storageManager.getGoals().pauseThresholdSeconds
    );
    this.statsAggregator = new StatsAggregator(
      this.storageManager,
      this.storageManager.getGoals().dailyActiveMinutes
    );
    this.streakManager = new StreakManager(this.storageManager, this.statsAggregator);
    this.recordKeeper = new RecordKeeper(this.storageManager, this.statsAggregator);
    this.statusBarManager = new StatusBarItemManager(
      this.statsAggregator
    );
    this.dashboardPanel = new DashboardPanel(
      this._context.extensionUri,
      this.storageManager,
      this.statsAggregator,
      this.streakManager,
      this.recordKeeper
    );
  }

  /**
   * Activate the extension
   */
  async activate(): Promise<void> {
    try {
      outputChannel.appendLine('[CodePulse] Activating extension...');

      // Prune old sessions
      await this.storageManager.pruneOldSessions();

      // Perform midnight check on startup
      await this.streakManager.performMidnightCheck();

      // Register commands
      this.registerCommands();

      // Register event listeners
      this.registerEventListeners();

      // Schedule periodic midnight checks
      this.scheduleMidnightCheck();

      // Update settings from configuration
      this.updateSettingsFromConfig();

      outputChannel.appendLine('[CodePulse] Extension activated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      outputChannel.appendLine(`[ERROR] ${message}`);
      vscode.window.showErrorMessage(`CodePulse failed to activate: ${message}`);
    }
  }

  /**
   * Deactivate the extension
   */
  deactivate(): void {
    outputChannel.appendLine('[CodePulse] Deactivating extension...');

    // Close active session
    this.sessionEngine.forceCloseSession();

    // Clear midnight check interval
    if (this.midnightCheckInterval) {
      clearInterval(this.midnightCheckInterval);
    }

    // Dispose all resources
    this.disposables.forEach((d) => d.dispose());
    this.statusBarManager.dispose();
    this.dashboardPanel.dispose();
    this.sessionEngine.removeAllListeners();

    outputChannel.appendLine('[CodePulse] Extension deactivated');
  }

  // ─── Private Helpers ────────────────────────────────

  /**
   * Register extension commands
   */
  private registerCommands(): void {
    this.registerCommand('codepulse.openDashboard', () => this.openDashboard());
    this.registerCommand('codepulse.resetToday', () => this.resetToday());
    this.registerCommand('codepulse.toggleTracking', () => this.toggleTracking());
    this.registerCommand('codepulse.exportStats', () => this.exportStats());
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
      this.sessionEngine.handleTextChange(event);
    });

    this.sessionEngine.on('sessionClosed', async (event) => {
      // Save session to storage
      await this.storageManager.addSession(event.session);

      // Update stats
      this.statsAggregator.setDailyGoal(
        this.storageManager.getGoals().dailyActiveMinutes
      );

      // Check for streak goal hit
      const todayStats = this.statsAggregator.getTodayStats();
      if (todayStats.goalHit) {
        await this.streakManager.recordTodayGoalHit();
      }

      // Check for new records
      const isNewRecord = await this.recordKeeper.checkAndUpdateRecords(event.session);
      if (isNewRecord) {
        // Possibly update streak record too
        const streak = this.streakManager.getStreakState();
        await this.recordKeeper.updateStreakRecord(streak.current);
      }

      // Update UI
      this.statusBarManager.update();
      this.dashboardPanel.updateStats();

      outputChannel.appendLine(
        `[Session] ${event.session.durationSeconds}s, ${event.session.characters} chars`
      );
    });

    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration('codepulse')) {
          this.updateSettingsFromConfig();
        }
      }
    );

    this.disposables.push(textChangeListener, configChangeListener);
  }

  /**
   * Schedule midnight check
   */
  private scheduleMidnightCheck(): void {
    // Check every hour at a random minute to reduce server load (if needed)
    this.midnightCheckInterval = setInterval(async () => {
      await this.streakManager.performMidnightCheck();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Update settings from VS Code configuration
   */
  private updateSettingsFromConfig(): void {
    const config = vscode.workspace.getConfiguration('codepulse');

    const dailyGoal = config.get<number>('dailyGoalMinutes', 60);
    const pauseThreshold = config.get<number>('pauseThresholdSeconds', 10);
    const showWords = config.get<boolean>('showWordsInStatusBar', true);

    this.statsAggregator.setDailyGoal(dailyGoal);
    this.sessionEngine.setPauseThreshold(pauseThreshold);
    this.statusBarManager.setShowWordsInStatusBar(showWords);

    outputChannel.appendLine(
      `[Config] Daily goal: ${dailyGoal}min, Pause: ${pauseThreshold}s`
    );
  }

  /**
   * Open the dashboard panel
   */
  private async openDashboard(): Promise<void> {
    await this.dashboardPanel.open();
    outputChannel.appendLine('[Command] Dashboard opened');
  }

  /**
   * Reset today's stats
   */
  private resetToday(): void {
    const today = getTodayDate();
    const storage = this.storageManager.getStorage();

    if (storage.sessions[today]) {
      delete storage.sessions[today];
      this.storageManager.saveStorage(storage).catch((err) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        outputChannel.appendLine(`[ERROR] Failed to reset today: ${message}`);
      });

      vscode.window.showWarningMessage('⚠️ Today\'s stats have been reset.');
      this.statusBarManager.update();
      this.dashboardPanel.updateStats();

      outputChannel.appendLine('[Command] Today reset');
    }
  }

  /**
   * Toggle tracking on/off
   */
  private toggleTracking(): void {
    const currentState = this.sessionEngine.getState();
    const isEnabled = currentState !== 'IDLE' || this.sessionEngine.getCurrentDelta().characters > 0;

    this.sessionEngine.setTrackingEnabled(!isEnabled);
    vscode.window.showInformationMessage(
      `CodePulse tracking is now ${!isEnabled ? '✅ enabled' : '⏸️ paused'}`
    );

    outputChannel.appendLine(
      `[Command] Tracking toggled to ${!isEnabled ? 'enabled' : 'paused'}`
    );
  }

  /**
   * Export stats as JSON
   */
  private exportStats(): void {
    try {
      const json = this.storageManager.exportAsJSON();
      const timestamp = new Date().toISOString().split('T')[0];

      Promise.resolve(
        vscode.window
          .showSaveDialog({
            defaultUri: vscode.Uri.file(`codepulse-export-${timestamp}.json`),
            filters: { JSON: ['json'] },
          })
          .then((uri: vscode.Uri | undefined) => {
            if (uri) {
              return Promise.resolve(vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8')))
                .then(() => {
                  vscode.window.showInformationMessage(`✅ Stats exported to ${uri.fsPath}`);
                  outputChannel.appendLine(`[Command] Stats exported to ${uri.fsPath}`);
                })
                .catch((err: Error) => {
                  const message = err instanceof Error ? err.message : 'Unknown error';
                  vscode.window.showErrorMessage(`Failed to export stats: ${message}`);
                });
            }
            return undefined;
          })
      )
        .catch((err: Error) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          vscode.window.showErrorMessage(`Export failed: ${message}`);
        });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${message}`);
    }
  }

  /**
   * Register a single command
   */
  private registerCommand(
    commandId: string,
    handler: (...args: unknown[]) => unknown
  ): void {
    const disposable = vscode.commands.registerCommand(commandId, handler);
    this.disposables.push(disposable);
  }
}

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('CodePulse');

  try {
    extension = new CodePulseExtension(context);
    await extension.activate();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    outputChannel.appendLine(`[FATAL] ${message}`);
    vscode.window.showErrorMessage(`CodePulse initialization failed: ${message}`);
  }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  if (extension) {
    extension.deactivate();
  }
  outputChannel.dispose();
}
