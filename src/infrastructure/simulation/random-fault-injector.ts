import { InjectedFaultError } from '../../application/errors';
import type { DemoSettingsStore } from '../../application/ports/demo-settings';
import type { FaultInjector } from '../../application/ports/fault-injector';

export class RandomFaultInjector implements FaultInjector {
  constructor(private readonly settings: DemoSettingsStore) {}

  maybeFail(step: string): void {
    if (Math.random() * 100 < this.settings.get().faultRatePercent) throw new InjectedFaultError(step);
  }
}
