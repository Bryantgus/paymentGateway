import { IdempotencyConflictError, InvalidIdempotencyKeyError, ProductNotFoundError } from '../errors';
import type { DemoSettingsStore } from '../ports/demo-settings';
import type { OrderRepository } from '../ports/order-repository';
import type { CreatedPayment, PaymentGateway } from '../ports/payment-gateway';
import type { ProductCatalog } from '../ports/product-catalog';

/** Accepted key format: the client generates it (a UUID, for example). */
const IDEMPOTENCY_KEY_FORMAT = /^[A-Za-z0-9_-]{16,128}$/;

/** Use case: start charging for a catalog product. */
export class CreatePayment {
  constructor(
    private readonly catalog: ProductCatalog,
    private readonly gateway: PaymentGateway,
    private readonly orders: OrderRepository,
    private readonly settings: DemoSettingsStore
  ) {}

  /**
   * With idempotency enabled, `idempotencyKey` identifies ONE purchase attempt: repeating the request
   * (double click, retry after a network cut) returns the same order and the same payment.
   * When disabled, every call creates a new order and a new payment, even if it is the same click repeated.
   */
  async execute(productId: string, idempotencyKey?: string): Promise<CreatedPayment> {
    const product = this.catalog.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    const input = { amount: product.amount, currency: product.currency, productName: product.name };

    if (!this.settings.get().idempotencyEnabled) {
      const order = this.orders.create(input);
      const payment = await this.gateway.createPayment(input);
      this.orders.attachPayment(order.id, payment.paymentId);
      return payment;
    }

    if (!idempotencyKey || !IDEMPOTENCY_KEY_FORMAT.test(idempotencyKey)) {
      throw new InvalidIdempotencyKeyError('Missing Idempotency-Key header (16 to 128 characters: letters, digits, _ or -)');
    }

    // Order: if the key already exists, it is the same attempt. If it exists with another product, the client made a mistake.
    const { order, created } = this.orders.findOrCreateByKey(idempotencyKey, input);
    if (!created && (order.productName !== input.productName || order.amount !== input.amount)) {
      throw new IdempotencyConflictError('That idempotency key was already used with a different product');
    }

    // Payment: the gateway also remembers the key, so it returns the same payment if it already created it.
    const payment = await this.gateway.createPayment(input, { idempotencyKey });
    this.orders.attachPayment(order.id, payment.paymentId);
    return payment;
  }
}
