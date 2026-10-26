import type { DatabaseSync } from 'node:sqlite';
import type { Logger } from '../../application/ports/logger';
import type { SmsRecord, SmsSender } from '../../application/ports/sms-sender';

/** Fake SMS: nothing goes out to a provider, it is only recorded. It takes a while, like a real network call. */
export class FakeSmsSender implements SmsSender {
  constructor(
    private readonly db: DatabaseSync,
    private readonly logger: Logger,
    private readonly latencyMs = 300
  ) {}

  async send(orderId: number, message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    this.db
      .prepare('INSERT INTO sms_log (order_id, message, sent_at) VALUES (?, ?, ?)')
      .run(orderId, message, new Date().toISOString());
    this.logger.info(`📲 SMS sent (order ${orderId}): ${message}`);
  }

  list(): SmsRecord[] {
    const rows = this.db.prepare('SELECT * FROM sms_log ORDER BY id').all() as unknown as {
      id: number;
      order_id: number;
      message: string;
      sent_at: string;
    }[];
    return rows.map((r) => ({ id: r.id, orderId: r.order_id, message: r.message, sentAt: r.sent_at }));
  }
}
