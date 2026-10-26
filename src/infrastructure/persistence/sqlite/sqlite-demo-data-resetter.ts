import type { DatabaseSync } from 'node:sqlite';
import type { DemoDataResetter } from '../../../application/ports/demo-data-resetter';

export class SqliteDemoDataResetter implements DemoDataResetter {
  constructor(private readonly db: DatabaseSync) {}

  reset(): void {
    this.db.exec(`
      DELETE FROM orders;
      DELETE FROM payments;
      DELETE FROM processed_events;
      DELETE FROM sms_log;
      DELETE FROM sqlite_sequence;
    `);
  }
}
