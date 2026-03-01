/**
 * DeltaCalculator - Tracks character/word/line deltas from text changes
 */

import * as vscode from 'vscode';
import { SessionDelta } from '../models/types';
import { countCharacters, countWords, countLines } from '../utils/textUtils';

export class DeltaCalculator {
  private delta: SessionDelta = {
    characters: 0,
    words: 0,
    lines: 0,
  };

  /**
   * Get current accumulated deltas
   */
  getDelta(): SessionDelta {
    return { ...this.delta };
  }

  /**
   * Reset deltas (called at start of new session)
   */
  reset(): void {
    this.delta = {
      characters: 0,
      words: 0,
      lines: 0,
    };
  }

  /**
   * Process a text document change event
   * Only processes insertions (additions), not deletions
   */
  processChange(event: vscode.TextDocumentChangeEvent): void {
    for (const change of event.contentChanges) {
      // Only process insertions (change.text.length > 0)
      // Deletions are ignored
      if (change.text.length > 0) {
        this.delta.characters += countCharacters(change.text);
        this.delta.words += countWords(change.text);
        this.delta.lines += countLines(change.text);
      }
    }
  }

  /**
   * Add explicit quantities (for testing or manual adjustments)
   */
  add(partial: Partial<SessionDelta>): void {
    if (partial.characters !== undefined) {
      this.delta.characters += partial.characters;
    }
    if (partial.words !== undefined) {
      this.delta.words += partial.words;
    }
    if (partial.lines !== undefined) {
      this.delta.lines += partial.lines;
    }
  }

  /**
   * Set explicit quantities (for testing)
   */
  set(partial: Partial<SessionDelta>): void {
    if (partial.characters !== undefined) {
      this.delta.characters = partial.characters;
    }
    if (partial.words !== undefined) {
      this.delta.words = partial.words;
    }
    if (partial.lines !== undefined) {
      this.delta.lines = partial.lines;
    }
  }
}
