/**
 * Hechos que la pasarela nos comunica sobre un pago, expresados en nuestro vocabulario.
 * La infraestructura traduce los eventos de Stripe a estos tipos, así el resto del código no conoce a Stripe.
 */
export type PaymentEvent =
  | {
      type: 'payment.succeeded';
      paymentId: string;
      /** En centavos. */
      amount: number;
      currency: string;
      productName?: string;
    }
  | { type: 'payment.failed'; paymentId: string; reason: string }
  // Evento que todavía no manejamos (reembolsos, disputas...). Aquí se irán agregando.
  | { type: 'unhandled'; gatewayType: string };
