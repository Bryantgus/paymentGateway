export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Producto inválido: ${productId}`);
    this.name = 'ProductNotFoundError';
  }
}

/** La firma del webhook no es válida (o falta configurar el secreto): la llamada no viene de Stripe. */
export class InvalidWebhookSignatureError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidWebhookSignatureError';
  }
}

/** La pasarela falló al procesar la operación. El detalle técnico queda en `cause`. */
export class PaymentGatewayError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'PaymentGatewayError';
  }
}
