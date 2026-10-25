/** Producto del catálogo. El precio vive en el servidor: nunca confíes en el monto que envía el cliente. */
export interface Product {
  readonly id: string;
  readonly name: string;
  /** En centavos de la moneda indicada. */
  readonly amount: number;
  readonly currency: string;
}
