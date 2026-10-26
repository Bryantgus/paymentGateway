export interface SimulatedPaymentSucceeded {
  /** Always the same for a given order: delivering it again is equivalent to a gateway retry. */
  eventId: string;
  paymentId: string;
  amount: number;
  currency: string;
  productName: string;
}

/** Delivers an approved-payment notice to our own webhook, signed the way the gateway would sign it. */
export interface WebhookSimulator {
  /** Makes `times` simultaneous deliveries and returns the HTTP status the webhook answered for each one. */
  deliver(event: SimulatedPaymentSucceeded, times: number): Promise<number[]>;
}
