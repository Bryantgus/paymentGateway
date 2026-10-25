import type { Product } from '../../domain/products/product';

export interface ProductCatalog {
  list(): Product[];
  findById(id: string): Product | undefined;
}
