import type { DemoSettings, DemoSettingsStore } from '../../application/ports/demo-settings';

/** Lab settings. They live in memory: when the server restarts they go back to their defaults. */
export class InMemoryDemoSettings implements DemoSettingsStore {
  private settings: DemoSettings = { idempotencyEnabled: true, faultRatePercent: 0 };

  get(): DemoSettings {
    return { ...this.settings };
  }

  update(patch: Partial<DemoSettings>): DemoSettings {
    this.settings = { ...this.settings, ...patch };
    return this.get();
  }
}
