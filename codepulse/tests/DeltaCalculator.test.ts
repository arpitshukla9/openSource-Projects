/**
 * DeltaCalculator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeltaCalculator } from '../src/core/DeltaCalculator';

describe('DeltaCalculator', () => {
  let calculator: DeltaCalculator;

  beforeEach(() => {
    calculator = new DeltaCalculator();
  });

  it('counts characters correctly for a single insertion', () => {
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: 'hello',
          range: {} as any,
        },
      ],
    } as any);

    const delta = calculator.getDelta();
    expect(delta.characters).toBe(5);
  });

  it('counts words by spaces and newlines', () => {
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: 'hello world\nfoo bar',
          range: {} as any,
        },
      ],
    } as any);

    const delta = calculator.getDelta();
    expect(delta.words).toBe(4);
  });

  it('counts lines by newline characters', () => {
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: 'line1\nline2\nline3',
          range: {} as any,
        },
      ],
    } as any);

    const delta = calculator.getDelta();
    expect(delta.lines).toBe(2);
  });

  it('ignores deletion events (text.length === 0)', () => {
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: 'hello',
          range: {} as any,
        },
      ],
    } as any);

    const originalDelta = calculator.getDelta();

    // Process deletion
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: '',
          range: {} as any,
        },
      ],
    } as any);

    const afterDeletion = calculator.getDelta();

    // Numbers should not change
    expect(afterDeletion.characters).toBe(originalDelta.characters);
    expect(afterDeletion.words).toBe(originalDelta.words);
    expect(afterDeletion.lines).toBe(originalDelta.lines);
  });

  it('handles large paste events correctly', () => {
    const largeText = 'hello world\n'.repeat(100);

    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: largeText,
          range: {} as any,
        },
      ],
    } as any);

    const delta = calculator.getDelta();
    expect(delta.characters).toBe(largeText.length);
    expect(delta.lines).toBe(100);
  });

  it('handles multi-cursor edits (multiple contentChanges)', () => {
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: 'a',
          range: {} as any,
        },
        {
          text: 'b',
          range: {} as any,
        },
        {
          text: 'c',
          range: {} as any,
        },
      ],
    } as any);

    const delta = calculator.getDelta();
    expect(delta.characters).toBe(3);
  });

  it('resets deltas correctly', () => {
    calculator.processChange({
      document: {} as any,
      contentChanges: [
        {
          text: 'hello',
          range: {} as any,
        },
      ],
    } as any);

    expect(calculator.getDelta().characters).toBe(5);

    calculator.reset();

    expect(calculator.getDelta().characters).toBe(0);
    expect(calculator.getDelta().words).toBe(0);
    expect(calculator.getDelta().lines).toBe(0);
  });

  it('allows manual addition of deltas', () => {
    calculator.add({ characters: 10, words: 2, lines: 1 });

    const delta = calculator.getDelta();
    expect(delta.characters).toBe(10);
    expect(delta.words).toBe(2);
    expect(delta.lines).toBe(1);
  });

  it('allows setting deltas explicitly', () => {
    calculator.set({ characters: 5, words: 1 });

    const delta = calculator.getDelta();
    expect(delta.characters).toBe(5);
    expect(delta.words).toBe(1);
    expect(delta.lines).toBe(0);
  });
});
