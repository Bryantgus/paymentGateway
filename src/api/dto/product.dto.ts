import type { Product } from '../../domain/products/product';

/** Shape in which the frontend receives a product (HTTP contract, independent of the domain model). */
export interface ProductDto {
  name: string;
  amount: number;
}

export function toProductsDto(products: Product[]): Record<string, ProductDto> {
  return Object.fromEntries(products.map((p) => [p.id, { name: p.name, amount: p.amount }]));
}
