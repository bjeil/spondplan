import { supabase } from '../supabase';
import type { SpondAdapter, SpondEvent, SpondEventAttendance, SpondGroup } from './types';

/**
 * Adapter som går via Supabase Edge Function (ikke direkte til Spond).
 * Dette er adapteren PWA-klienten skal bruke – Spond-legitimasjonen ligger
 * kun i Edge Function, og CORS-problemet unngås.
 */
export class EdgeFunctionSpondAdapter implements SpondAdapter {
  private client() {
    return supabase;
  }

  async listGroups(): Promise<SpondGroup[]> {
    const { data, error } = await this.client().functions.invoke('spond', {
      body: { action: 'members' }
    });
    if (error) throw new Error(`spond/members feilet: ${error.message}`);
    return (data?.groups ?? []) as SpondGroup[];
  }

  async listEvents(groupId: string, from: Date, to: Date): Promise<SpondEvent[]> {
    const { data, error } = await this.client().functions.invoke('spond', {
      body: { action: 'listEvents', groupId, from: from.toISOString(), to: to.toISOString() }
    });
    if (error) throw new Error(`spond/listEvents feilet: ${error.message}`);
    return (data?.events ?? []) as SpondEvent[];
  }

  async getAttendance(eventId: string): Promise<SpondEventAttendance> {
    const { data, error } = await this.client().functions.invoke('spond', {
      body: { action: 'attendance', eventId }
    });
    if (error) throw new Error(`spond/attendance feilet: ${error.message}`);
    return data as SpondEventAttendance;
  }
}

/** Ferdig konfigurert adapter mot prosjektets Edge Function. */
export const edgeSpondAdapter: SpondAdapter = new EdgeFunctionSpondAdapter();
