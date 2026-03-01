/**
 * Text analysis utilities for CodePulse
 */

/**
 * Count characters in text (for insertion)
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Count words by splitting on whitespace and newlines
 * Uses a simple heuristic: words = spaces + newlines
 */
export function countWords(text: string): number {
  // Count spaces and newlines as word separators
  let wordCount = 0;
  let inWord = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isWhitespace = /\s/.test(char);

    if (!isWhitespace && !inWord) {
      wordCount++;
      inWord = true;
    } else if (isWhitespace && inWord) {
      inWord = false;
    }
  }

  return wordCount;
}

/**
 * Count newlines in text (can be used for line tracking)
 */
export function countNewlines(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      count++;
    }
  }
  return count;
}

/**
 * Count lines of code (newlines + 1 if content exists)
 * This is a rough approximation, as the actual line count depends on
 * the context of where the text was inserted.
 */
export function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return countNewlines(text);
}

/**
 * Format large numbers with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get a casual noun for activity (for status bar)
 */
export function getActivityNoun(count: number): string {
  if (count === 1) return 'word';
  return 'words';
}

/**
 * Sanitize text for safe display (remove control characters)
 */
export function sanitizeText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x1F\x7F]/g, ' ');
}

/**
 * Extract language-specific metrics (simple heuristic)
 * Could be enhanced with language-specific parsers
 */
export function estimateLanguageMetrics(
  text: string
): { characters: number; words: number; lines: number } {
  const characters = countCharacters(text);
  const words = countWords(text);
  const lines = countLines(text);

  return {
    characters,
    words,
    lines,
  };
}

/**
 * Check if text contains only whitespace
 */
export function isWhitespaceOnly(text: string): boolean {
  return /^\s*$/.test(text);
}

/**
 * Get the most common language in an array
 */
export function getMostCommonLanguage(languages: string[]): string | null {
  if (languages.length === 0) return null;

  const frequency: Record<string, number> = {};
  for (const lang of languages) {
    frequency[lang] = (frequency[lang] || 0) + 1;
  }

  let maxLang: string | null = null;
  let maxCount = 0;

  for (const [lang, count] of Object.entries(frequency)) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang;
    }
  }

  return maxLang;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
