import { describe, expect, it } from 'vitest';
import { DEFAULT_TOPICS } from '../src/lib/topics';

describe('DEFAULT_TOPICS', () => {
  it('inneholder Landslagsskolen A1–A3 og F1–F3', () => {
    const keys = DEFAULT_TOPICS.map((t) => t.key);
    for (const k of ['A1', 'A2', 'A3', 'F1', 'F2', 'F3']) expect(keys).toContain(k);
  });

  it('har unike nøkler', () => {
    const keys = DEFAULT_TOPICS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
