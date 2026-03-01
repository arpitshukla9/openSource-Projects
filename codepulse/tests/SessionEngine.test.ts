/**
 * SessionEngine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionEngine } from '../src/core/SessionEngine';

describe('SessionEngine', () => {
  let engine: SessionEngine;

  beforeEach(() => {
    engine = new SessionEngine(10);
  });

  it('starts a session on first keypress', () => {
    const listener = vi.fn();
    engine.on('sessionClosed', listener);

    // Simulate a text change
    engine.handleTextChange({
      document: {
        languageId: 'typescript',
        fileName: 'test.ts',
      } as any,
      contentChanges: [
        {
          text: 'hello',
          range: {} as any,
        },
      ],
    } as any);

    expect(engine.getState()).toBe('ACTIVE');
  });

  it('does not create a new session if already active', () => {
    const listener = vi.fn();
    engine.on('sessionClosed', listener);

    // First event
    engine.handleTextChange({
      document: {
        languageId: 'typescript',
        fileName: 'test.ts',
      } as any,
      contentChanges: [{ text: 'a', range: {} as any }],
    } as any);

    const firstDelta = engine.getCurrentDelta();

    // Second event (within 10s)
    engine.handleTextChange({
      document: {
        languageId: 'typescript',
        fileName: 'test.ts',
      } as any,
      contentChanges: [{ text: 'b', range: {} as any }],
    } as any);

    const secondDelta = engine.getCurrentDelta();

    // Session is still active, and deltas accumulated
    expect(engine.getState()).toBe('ACTIVE');
    expect(secondDelta.characters).toBeGreaterThan(firstDelta.characters);
  });

  it('closes a session after pause threshold', async () => {
    const listener = vi.fn();
    engine.on('sessionClosed', listener);
    engine.setPauseThreshold(1); // 1 second for testing

    // Start session
    engine.handleTextChange({
      document: {
        languageId: 'typescript',
        fileName: 'test.ts',
      } as any,
      contentChanges: [{ text: 'test', range: {} as any }],
    } as any);

    expect(engine.getState()).toBe('ACTIVE');

    // Wait > 5 seconds for session to close and emit event (pause threshold + duration requirement)
    await new Promise((resolve) => setTimeout(resolve, 5200));

    // Session should have emitted event and reset to IDLE
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].session).toBeDefined();
    expect(engine.getState()).toBe('IDLE');
  });

  it('resets delta counts on new session', () => {
    const listener = vi.fn();
    engine.on('sessionClosed', listener);
    engine.setPauseThreshold(1);

    // First session
    engine.handleTextChange({
      document: { languageId: 'typescript', fileName: 'test.ts' } as any,
      contentChanges: [{ text: 'hello', range: {} as any }],
    } as any);

    const firstDelta = engine.getCurrentDelta().characters;

    // Wait for session to close
    setTimeout(() => {
      // Second session
      engine.handleTextChange({
        document: { languageId: 'typescript', fileName: 'test.ts' } as any,
        contentChanges: [{ text: 'world', range: {} as any }],
      } as any);

      const secondDelta = engine.getCurrentDelta();

      // Deltas should not accumulate across sessions
      expect(secondDelta.characters).toBeLessThan(firstDelta);
    }, 1100);
  });

  it('ignores deletion events (text.length === 0)', () => {
    engine.handleTextChange({
      document: { languageId: 'typescript', fileName: 'test.ts' } as any,
      contentChanges: [{ text: 'hello', range: {} as any }],
    } as any);

    const originalDelta = engine.getCurrentDelta();

    // Deletion event
    engine.handleTextChange({
      document: { languageId: 'typescript', fileName: 'test.ts' } as any,
      contentChanges: [{ text: '', range: {} as any }],
    } as any);

    const afterDeletion = engine.getCurrentDelta();

    // Characters should not decrease
    expect(afterDeletion.characters).toBe(originalDelta.characters);
  });

  it('disables tracking when setTrackingEnabled(false)', () => {
    const listener = vi.fn();
    engine.on('sessionClosed', listener);

    engine.handleTextChange({
      document: { languageId: 'typescript', fileName: 'test.ts' } as any,
      contentChanges: [{ text: 'test', range: {} as any }],
    } as any);

    expect(engine.getState()).toBe('ACTIVE');

    engine.setTrackingEnabled(false);

    // Try to handle another change
    engine.handleTextChange({
      document: { languageId: 'typescript', fileName: 'test.ts' } as any,
      contentChanges: [{ text: 'more', range: {} as any }],
    } as any);

    // State should be IDLE when tracking is disabled
    expect(engine.getState()).toBe('IDLE');
  });
});
