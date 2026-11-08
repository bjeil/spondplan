import { db } from './db';
import { supabase } from './supabase';
import { getUserId } from './auth';
import type { CoachingPoint, Drill, SessionPlan } from './types';

// ---------- Øktplaner ----------

export async function listPlans(): Promise<SessionPlan[]> {
  const plans = await db.sessionPlans.toArray();
  return plans.sort((a, b) => a.title.localeCompare(b.title, 'nb'));
}

export async function createPlan(title: string, topicId: string | null): Promise<SessionPlan> {
  const plan: SessionPlan = {
    id: crypto.randomUUID(),
    title: title.trim(),
    topicId,
    coachingPointIds: [],
    updatedAt: new Date().toISOString()
  };
  if (!plan.title) throw new Error('Tittel kreves');
  await db.sessionPlans.put(plan);
  const userId = await getUserId();
  if (userId) {
    await supabase.from('session_plans').insert({
      id: plan.id,
      user_id: userId,
      title: plan.title,
      topic_id: plan.topicId,
      updated_at: plan.updatedAt
    });
  }
  return plan;
}

export async function getPlanWithDrills(planId: string): Promise<{ plan: SessionPlan; drills: Drill[] } | null> {
  const plan = await db.sessionPlans.get(planId);
  if (!plan) return null;
  const drills = (await db.drills.where('planId').equals(planId).toArray()).sort((a, b) => a.sortOrder - b.sortOrder);
  return { plan, drills };
}

// ---------- Øvelser ----------

export async function addDrill(planId: string, title: string): Promise<Drill> {
  const existing = await db.drills.where('planId').equals(planId).toArray();
  const drill: Drill = {
    id: crypto.randomUUID(),
    planId,
    title: title.trim(),
    durationMin: null,
    description: null,
    topicId: null,
    groupCount: 2,
    groupingMode: 'balanced',
    sortOrder: existing.length,
    coachingPointIds: [],
    updatedAt: new Date().toISOString()
  };
  if (!drill.title) throw new Error('Tittel på øvelse kreves');
  await db.drills.put(drill);
  const userId = await getUserId();
  if (userId) {
    await supabase.from('drills').insert({
      id: drill.id,
      plan_id: planId,
      title: drill.title,
      duration_min: drill.durationMin,
      description: drill.description,
      topic_id: drill.topicId,
      group_count: drill.groupCount,
      grouping_mode: drill.groupingMode,
      sort_order: drill.sortOrder,
      updated_at: drill.updatedAt
    });
  }
  return drill;
}

export async function updateDrill(drill: Drill): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db.drills.put({ ...drill, updatedAt });
  const userId = await getUserId();
  if (userId) {
    await supabase.from('drills').upsert({
      id: drill.id,
      plan_id: drill.planId,
      title: drill.title,
      duration_min: drill.durationMin,
      description: drill.description,
      topic_id: drill.topicId,
      group_count: drill.groupCount,
      grouping_mode: drill.groupingMode,
      sort_order: drill.sortOrder,
      updated_at: updatedAt
    });
  }
}

// ---------- Coaching points ----------

export async function listCoachingPoints(): Promise<CoachingPoint[]> {
  const cps = await db.coachingPoints.toArray();
  return cps.sort((a, b) => a.text.localeCompare(b.text, 'nb'));
}

export async function addCoachingPoint(text: string): Promise<CoachingPoint> {
  const cp: CoachingPoint = { id: crypto.randomUUID(), text: text.trim(), updatedAt: new Date().toISOString() };
  if (!cp.text) throw new Error('Coaching point kan ikke være tom');
  await db.coachingPoints.put(cp);
  const userId = await getUserId();
  if (userId) {
    await supabase.from('coaching_points').insert({
      id: cp.id,
      user_id: userId,
      text: cp.text,
      updated_at: cp.updatedAt
    });
  }
  return cp;
}
