import type { DatabaseSync } from 'node:sqlite';
import type { ProcessedEventStore } from '../../../application/ports/processed-event-store';

export class SqliteProcessedEventStore implements ProcessedEventStore {
  constructor(private readonly db: DatabaseSync) {}

  reserve(eventId: string): boolean {
    // A single atomic step: insert if it doesn't exist. If it was already there, no row changes.
    // Doing it in two steps ("does it exist? no -> insert it") would let two simultaneous deliveries through.
    const result = this.db
      .prepare('INSERT OR IGNORE INTO processed_events (event_id, processed_at) VALUES (?, ?)')
      .run(eventId, new Date().toISOString());
    return Number(result.changes) > 0;
  }

  list(): string[] {
    const rows = this.db.prepare('SELECT event_id FROM processed_events ORDER BY processed_at').all() as unknown as {
      event_id: string;
    }[];
    return rows.map((r) => r.event_id);
  }
}
