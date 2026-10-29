import { createClient } from '@supabase/supabase-js';
import type { SpondAdapter, SpondEvent, SpondEventAttendance } from './types';

/**
 * Adapter som går via Supabase Edge Function (ikke direkte til Spond).
 * Dette er adapteren PWA-klienten skal bruke – Spond-legitimasjonen ligger
 * kun i Edge Function, og CORS-problemet unngås.
 */
export class EdgeFunctionSpondAdapter implements SpondAdapter {
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseAnonKey: string
  ) {}

  private client() {
    return createClient(this.supabaseUrl, this.supabaseAnonKey);
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
