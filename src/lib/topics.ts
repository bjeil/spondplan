import { db } from './db';
import { supabase } from './supabase';
import { getUserId } from './auth';
import type { Topic } from './types';

/** Landslagsskolen-temaer (kan utvides av brukeren). */
export const DEFAULT_TOPICS: Array<Omit<Topic, 'id' | 'updatedAt'>> = [
  { key: 'A1', name: 'Angrep – individuell teknikk', description: null },
  { key: 'A2', name: 'Angrep – samhandling', description: null },
  { key: 'A3', name: 'Angrep – lag', description: null },
  { key: 'F1', name: 'Forsvar – individuelt', description: null },
  { key: 'F2', name: 'Forsvar – samhandling', description: null },
  { key: 'F3', name: 'Forsvar – lag', description: null }
];

export async function listTopics(): Promise<Topic[]> {
  const topics = await db.topics.toArray();
  return topics.sort((a, b) => a.key.localeCompare(b.key, 'nb'));
}

/** Seed standard-temaer første gang (idempotent). */
export async function seedDefaultTopics(): Promise<void> {
  const existing = await db.topics.toArray();
  const existingKeys = new Set(existing.map((t) => t.key));
  const userId = await getUserId();
  for (const t of DEFAULT_TOPICS) {
    if (existingKeys.has(t.key)) continue;
    const topic: Topic = { id: crypto.randomUUID(), ...t, updatedAt: new Date().toISOString() };
    await db.topics.put(topic);
    if (userId) {
      await supabase.from('topics').upsert({
        id: topic.id,
        user_id: userId,
        key: topic.key,
        name: topic.name,
        description: topic.description,
        updated_at: topic.updatedAt
      });
    }
  }
}
