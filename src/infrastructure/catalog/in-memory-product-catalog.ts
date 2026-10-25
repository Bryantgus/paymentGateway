import type { ProductCatalog } from '../../application/ports/product-catalog';
import type { Product } from '../../domain/products/product';

const PRODUCTS: Product[] = [
  { id: 'camiseta', name: 'Camiseta', amount: 2500, currency: 'usd' },
  { id: 'taza', name: 'Taza', amount: 1200, currency: 'usd' },
  { id: 'libro', name: 'Libro', amount: 4000, currency: 'usd' },
];

/** Catálogo de ejemplo en memoria. Cuando haya base de datos, se reemplaza por otra implementación del puerto. */
export class InMemoryProductCatalog implements ProductCatalog {
  private readonly byId = new Map(PRODUCTS.map((product) => [product.id, product]));

  list(): Product[] {
    return [...this.byId.values()];
  }

  findById(id: string): Product | undefined {
    return this.byId.get(id);
  }
}
