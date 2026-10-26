/**
 * One purchase attempt = one idempotency key.
 * While the user keeps trying to buy the SAME product, retries (double click, network cut)
 * reuse the key and the server recognizes them as the same purchase. If they switch product, it is another purchase: new key.
 */
let attempt: { productId: string; key: string } | undefined;

export function attemptKeyFor(productId: string): string {
  if (!attempt || attempt.productId !== productId) {
    attempt = { productId, key: crypto.randomUUID() };
  }
  return attempt.key;
}

/** The purchase finished (or was abandoned): the next one, even for the same product, is a new purchase. */
export function finishAttempt(): void {
  attempt = undefined;
}
