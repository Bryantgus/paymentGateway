export interface DemoSettings {
  /**
   * Exists only for the demo: in a real system idempotency is never optional.
   * When off, the system behaves like one without protection, so you can see which problems appear.
   */
  idempotencyEnabled: boolean;
  /** Probability (0-100) that a processing step fails on purpose. */
  faultRatePercent: number;
}

export interface DemoSettingsStore {
  get(): DemoSettings;
  update(patch: Partial<DemoSettings>): DemoSettings;
}
