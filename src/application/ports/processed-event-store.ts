/** Memory of the gateway events we have already processed. */
export interface ProcessedEventStore {
  /**
   * Tries to mark the event as processed. Returns `true` the first time and `false` if it was already there.
   * Must be atomic: two simultaneous deliveries of the same event cannot both win.
   */
  reserve(eventId: string): boolean;
  list(): string[];
}
