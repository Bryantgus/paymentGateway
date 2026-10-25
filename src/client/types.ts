/** Contrato con el backend (ver `src/api/dto`). */
export interface Product {
  nombre: string;
  monto: number;
}

export interface AppConfig {
  publishableKey: string;
  productos: Record<string, Product>;
}

export type CreatePaymentResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: string };
