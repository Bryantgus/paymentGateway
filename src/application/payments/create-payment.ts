import { ProductNotFoundError } from '../errors';
import type { CreatedPayment, PaymentGateway } from '../ports/payment-gateway';
import type { ProductCatalog } from '../ports/product-catalog';

/** Caso de uso: iniciar el cobro de un producto del catálogo. */
export class CreatePayment {
  constructor(
    private readonly catalog: ProductCatalog,
    private readonly gateway: PaymentGateway
  ) {}

  async execute(productId: string): Promise<CreatedPayment> {
    const product = this.catalog.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    return this.gateway.createPayment({
      amount: product.amount,
      currency: product.currency,
      productName: product.name,
    });
  }
}
