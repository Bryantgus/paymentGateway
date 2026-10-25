import type { Product } from '../../domain/products/product';

/** Forma en que el frontend recibe un producto (contrato HTTP, independiente del modelo de dominio). */
export interface ProductDto {
  nombre: string;
  monto: number;
}

export function toProductsDto(products: Product[]): Record<string, ProductDto> {
  return Object.fromEntries(products.map((p) => [p.id, { nombre: p.name, monto: p.amount }]));
}
