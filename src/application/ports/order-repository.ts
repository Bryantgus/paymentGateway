import type { Order } from '../../domain/orders/order';

export interface NewOrder {
  productName: string;
  amount: number;
  currency: string;
}

export interface OrderRepository {
  create(input: NewOrder): Order;
  /** Returns the order already created with that key, or creates it. `created` tells which of the two happened. */
  findOrCreateByKey(key: string, input: NewOrder): { order: Order; created: boolean };
  attachPayment(orderId: number, paymentId: string): void;
  findById(orderId: number): Order | undefined;
  findByPaymentId(paymentId: string): Order | undefined;
  /** Moves from `pending` to `paid`. Returns `false` if it was already paid (nothing changed). */
  markPaid(orderId: number): boolean;
  list(): Order[];
}
