export interface CreatePaymentInput {
  /** En centavos. */
  amount: number;
  currency: string;
  productName: string;
}

export interface CreatedPayment {
  /** Lo usa el frontend para confirmar el pago con la tarjeta. */
  clientSecret: string;
}

/** Puerto hacia la pasarela de pago. Lo implementa la infraestructura (hoy Stripe). */
export interface PaymentGateway {
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
}
