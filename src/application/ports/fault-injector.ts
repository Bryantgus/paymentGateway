/** Triggers failures on purpose (per the lab settings) to simulate crashes halfway through processing. */
export interface FaultInjector {
  /** Throws `InjectedFaultError` with the configured probability. `step` names the point where it "crashes". */
  maybeFail(step: string): void;
}
