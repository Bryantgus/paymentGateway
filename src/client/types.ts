/** Contract with the backend (see `src/api/dto`). */
export interface Product {
  name: string;
  amount: number;
}

export interface AppConfig {
  publishableKey: string;
  products: Record<string, Product>;
}

export type CreatePaymentResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: string };

export interface LabSettings {
  idempotency: boolean;
  faultRatePercent: number;
}

export interface LabOrder {
  id: number;
  product: string;
  amount: number;
  status: 'pending' | 'paid';
  paymentId: string | null;
  key: string | null;
  createdAt: string;
}

export interface LabCharge {
  id: number;
  orderId: number;
  paymentId: string;
  amount: number;
  createdAt: string;
}

export interface LabSms {
  id: number;
  orderId: number;
  message: string;
  sentAt: string;
}

export interface LabState {
  settings: LabSettings;
  orders: LabOrder[];
  charges: LabCharge[];
  sms: LabSms[];
  events: string[];
}
