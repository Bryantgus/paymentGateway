import type { ProductCatalog } from '../../application/ports/product-catalog';
import type { Product } from '../../domain/products/product';

const PRODUCTS: Product[] = [
  { id: 'tshirt', name: 'T-shirt', amount: 2500, currency: 'usd' },
  { id: 'mug', name: 'Mug', amount: 1200, currency: 'usd' },
  { id: 'book', name: 'Book', amount: 4000, currency: 'usd' },
];

/** Sample in-memory catalog. Once there is a database, replace it with another implementation of the port. */
export class InMemoryProductCatalog implements ProductCatalog {
  private readonly byId = new Map(PRODUCTS.map((product) => [product.id, product]));

  list(): Product[] {
    return [...this.byId.values()];
  }

  findById(id: string): Product | undefined {
    return this.byId.get(id);
  }
}
