/** Deletes the demo data (orders, payments, SMS and events) to start from scratch. */
export interface DemoDataResetter {
  reset(): void;
}
