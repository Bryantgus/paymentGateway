export interface CreatePaymentInput {
  /** In cents. */
  amount: number;
  currency: string;
  productName: string;
}

export interface CreatedPayment {
  /** Payment id in the gateway. */
  paymentId: string;
  /** Used by the frontend to confirm the payment with the card. */
  clientSecret: string;
}

export interface CreatePaymentOptions {
  /** If given, repeating the call with the same key returns the same payment instead of creating another. */
  idempotencyKey?: string;
}

/** A payment that was already charged, as the gateway sees it. */
export interface SucceededPayment {
  paymentId: string;
  amount: number;
  currency: string;
  productName?: string;
}

/** Port to the payment gateway. Implemented by the infrastructure (currently Stripe). */
export interface PaymentGateway {
  createPayment(input: CreatePaymentInput, options?: CreatePaymentOptions): Promise<CreatedPayment>;
  /** Recently charged payments. Used to reconcile against what we recorded ourselves. */
  listSucceededPayments(): Promise<SucceededPayment[]>;
}
