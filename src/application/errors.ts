export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Invalid product: ${productId}`);
    this.name = 'ProductNotFoundError';
  }
}

/** The webhook signature is invalid (or the secret is not configured): the call does not come from Stripe. */
export class InvalidWebhookSignatureError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidWebhookSignatureError';
  }
}

/** The gateway failed to process the operation. The technical detail is kept in `cause`. */
export class PaymentGatewayError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'PaymentGatewayError';
  }
}

/** The idempotency key is missing or has an invalid format. */
export class InvalidIdempotencyKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIdempotencyKeyError';
  }
}

/** The same key was used for a different request, or the first request with that key is still in progress. */
export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

/** A payment notice arrived that doesn't match any of our orders (yet). */
export class OrderNotFoundError extends Error {
  constructor(reference: string) {
    super(`No order exists for ${reference}`);
    this.name = 'OrderNotFoundError';
  }
}

/** Failure deliberately triggered by the lab to simulate a crash halfway through processing. */
export class InjectedFaultError extends Error {
  constructor(readonly step: string) {
    super(`Simulated failure (${step})`);
    this.name = 'InjectedFaultError';
  }
}
