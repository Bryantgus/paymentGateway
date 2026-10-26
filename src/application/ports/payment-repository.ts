/** A charge recorded in our system: this is what the finance team would see. */
export interface PaymentRecord {
  id: number;
  orderId: number;
  paymentId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface PaymentRepository {
  insert(input: Omit<PaymentRecord, 'id' | 'createdAt'>): void;
  list(): PaymentRecord[];
}
