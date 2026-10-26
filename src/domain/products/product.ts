/** A catalog product. The price lives on the server: never trust the amount sent by the client. */
export interface Product {
  readonly id: string;
  readonly name: string;
  /** In cents of the given currency. */
  readonly amount: number;
  readonly currency: string;
}
