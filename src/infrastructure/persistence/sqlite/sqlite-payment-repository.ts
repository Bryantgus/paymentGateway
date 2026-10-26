import type { DatabaseSync } from 'node:sqlite';
import type { PaymentRecord, PaymentRepository } from '../../../application/ports/payment-repository';

interface PaymentRow {
  id: number;
  order_id: number;
  payment_id: string;
  amount: number;
  currency: string;
  created_at: string;
}

export class SqlitePaymentRepository implements PaymentRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(input: Omit<PaymentRecord, 'id' | 'createdAt'>): void {
    this.db
      .prepare('INSERT INTO payments (order_id, payment_id, amount, currency, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(input.orderId, input.paymentId, input.amount, input.currency, new Date().toISOString());
  }

  list(): PaymentRecord[] {
    const rows = this.db.prepare('SELECT * FROM payments ORDER BY id').all() as unknown as PaymentRow[];
    return rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      paymentId: r.payment_id,
      amount: r.amount,
      currency: r.currency,
      createdAt: r.created_at,
    }));
  }
}
