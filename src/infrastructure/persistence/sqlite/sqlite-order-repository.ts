import type { DatabaseSync } from 'node:sqlite';
import type { Order, OrderStatus } from '../../../domain/orders/order';
import type { NewOrder, OrderRepository } from '../../../application/ports/order-repository';

interface OrderRow {
  id: number;
  product_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_id: string | null;
  idempotency_key: string | null;
  created_at: string;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productName: row.product_name,
    amount: row.amount,
    currency: row.currency,
    status: row.status as OrderStatus,
    paymentId: row.payment_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
  };
}

export class SqliteOrderRepository implements OrderRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: NewOrder): Order {
    return this.insert(input, null);
  }

  findOrCreateByKey(key: string, input: NewOrder): { order: Order; created: boolean } {
    const existing = this.db
      .prepare('SELECT * FROM orders WHERE idempotency_key = ?')
      .get(key) as OrderRow | undefined;
    if (existing) return { order: toOrder(existing), created: false };
    // The column is UNIQUE: even if two requests arrived at once, the database would let only one through.
    return { order: this.insert(input, key), created: true };
  }

  attachPayment(orderId: number, paymentId: string): void {
    this.db.prepare('UPDATE orders SET payment_id = ? WHERE id = ?').run(paymentId, orderId);
  }

  findById(orderId: number): Order | undefined {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRow | undefined;
    return row && toOrder(row);
  }

  findByPaymentId(paymentId: string): Order | undefined {
    const row = this.db.prepare('SELECT * FROM orders WHERE payment_id = ?').get(paymentId) as OrderRow | undefined;
    return row && toOrder(row);
  }

  markPaid(orderId: number): boolean {
    // The WHERE makes only the first caller change the status: this is what makes repetition safe.
    const result = this.db.prepare("UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending'").run(orderId);
    return Number(result.changes) > 0;
  }

  list(): Order[] {
    const rows = this.db.prepare('SELECT * FROM orders ORDER BY id').all() as unknown as OrderRow[];
    return rows.map(toOrder);
  }

  private insert(input: NewOrder, key: string | null): Order {
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare('INSERT INTO orders (product_name, amount, currency, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(input.productName, input.amount, input.currency, key, createdAt);
    return {
      id: Number(result.lastInsertRowid),
      ...input,
      status: 'pending',
      idempotencyKey: key ?? undefined,
      createdAt,
    };
  }
}
