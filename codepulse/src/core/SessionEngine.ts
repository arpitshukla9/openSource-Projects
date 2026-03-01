/**
 * SessionEngine - Manages typing sessions with debounce logic
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { TypingSession, SessionClosedEvent } from '../models/types';
import { DeltaCalculator } from './DeltaCalculator';
import { getTodayDate } from '../utils/timeUtils';

// Session state machine
type SessionState = 'IDLE' | 'ACTIVE' | 'SAVING';

// Simplified nanoid inline
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class SessionEngine extends EventEmitter {
  private state: SessionState = 'IDLE';
  private sessionId: string = '';
  private startTime: number = 0;
  private debounceTimer: NodeJS.Timeout | null = null;
  private deltaCalculator = new DeltaCalculator();
  private touchedLanguages = new Set<string>();
  private touchedFiles = new Set<string>();
  private isTrackingEnabled = true;
  private pauseThresholdSeconds: number;

  constructor(pauseThresholdSeconds: number = 10) {
    super();
    this.pauseThresholdSeconds = pauseThresholdSeconds;
  }

  /**
   * Set pause threshold dynamically
   */
  setPauseThreshold(seconds: number): void {
    this.pauseThresholdSeconds = Math.max(5, Math.min(30, seconds));
  }

  /**
   * Enable/disable tracking
   */
  setTrackingEnabled(enabled: boolean): void {
    this.isTrackingEnabled = enabled;
    if (!enabled && this.state === 'ACTIVE') {
      this.closeSession();
    }
  }

  /**
   * Handle text document change
   */
  handleTextChange(event: vscode.TextDocumentChangeEvent): void {
    if (!this.isTrackingEnabled) {
      return;
    }

    // Track language and file
    this.touchedLanguages.add(event.document.languageId);
    this.touchedFiles.add(event.document.fileName);

    // Process deltas
    this.deltaCalculator.processChange(event);

    // State machine
    if (this.state === 'IDLE') {
      this.startSession();
    }

    // Clear and restart debounce timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.closeSession();
    }, this.pauseThresholdSeconds * 1000);
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get current session delta (for live status bar)
   */
  getCurrentDelta() {
    return this.deltaCalculator.getDelta();
  }

  /**
   * Get session start time (Unix ms)
   */
  getSessionStartTime(): number {
    return this.startTime;
  }

  /**
   * Manually close a session (e.g., on extension deactivation)
   */
  forceCloseSession(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.closeSession();
  }

  // ─── Private Helpers ────────────────────────────────

  /**
   * Start a new session
   */
  private startSession(): void {
    this.state = 'ACTIVE';
    this.sessionId = generateId();
    this.startTime = Date.now();
    this.deltaCalculator.reset();
    this.touchedLanguages.clear();
    this.touchedFiles.clear();
  }

  /**
   * Close the current session
   */
  private closeSession(): void {
    if (this.state === 'IDLE') {
      return; // Already closed
    }

    this.state = 'SAVING';

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - this.startTime) / 1000);

    // Filter micro-sessions (less than 5 seconds)
    if (durationSeconds >= 5) {
      const delta = this.deltaCalculator.getDelta();
      const primaryLanguage = this.getPrimaryLanguage();

      const session: TypingSession = {
        id: this.sessionId,
        startTime: this.startTime,
        endTime,
        durationSeconds,
        characters: delta.characters,
        words: delta.words,
        lines: delta.lines,
        language: primaryLanguage,
        fileCount: this.touchedFiles.size,
        date: getTodayDate(),
      };

      // Emit event (listener will handle storage)
      this.emit('sessionClosed', {
        session,
        isNewRecord: false, // Determined by RecordKeeper
      } as SessionClosedEvent);
    }

    // Reset for next session
    this.state = 'IDLE';
    this.sessionId = '';
    this.startTime = 0;
    this.deltaCalculator.reset();
    this.touchedLanguages.clear();
    this.touchedFiles.clear();
  }

  /**
   * Get the most-edited language in this session
   */
  private getPrimaryLanguage(): string {
    if (this.touchedLanguages.size === 0) {
      return 'unknown';
    }
    if (this.touchedLanguages.size === 1) {
      return Array.from(this.touchedLanguages)[0];
    }
    // Return the first (most recent is harder to track without detailed events)
    return Array.from(this.touchedLanguages)[0];
  }
}
