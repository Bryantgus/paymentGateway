/**
 * Transaction: either all the changes made inside `work` are saved, or none of them are.
 * `work` is synchronous on purpose: inside a transaction we never wait on anyone (network, SMS...).
 */
export interface UnitOfWork {
  run<T>(work: () => T): T;
}
