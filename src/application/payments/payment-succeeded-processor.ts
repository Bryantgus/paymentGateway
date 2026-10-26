import type { PaymentSucceededEvent } from '../../domain/payments/payment-event';

/**
 * What we do when the gateway reports an approved payment: mark the order, record the charge and notify the customer.
 * There are two versions on purpose, for comparison: `NaivePaymentSucceeded` (with the problems) and
 * `IdempotentPaymentSucceeded` (the fix). `HandleWebhook` picks one according to the lab switch.
 */
export interface PaymentSucceededProcessor {
  process(event: PaymentSucceededEvent): Promise<void>;
}

export function formatAmount(amount: number, currency: string): string {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}
