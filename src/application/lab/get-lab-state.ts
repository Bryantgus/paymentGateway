import type { Order } from '../../domain/orders/order';
import type { DemoSettings, DemoSettingsStore } from '../ports/demo-settings';
import type { OrderRepository } from '../ports/order-repository';
import type { PaymentRecord, PaymentRepository } from '../ports/payment-repository';
import type { ProcessedEventStore } from '../ports/processed-event-store';
import type { SmsRecord, SmsSender } from '../ports/sms-sender';

export interface LabState {
  settings: DemoSettings;
  orders: Order[];
  payments: PaymentRecord[];
  sms: SmsRecord[];
  processedEvents: string[];
}

/** Use case: snapshot of everything the lab shows on screen. */
export class GetLabState {
  constructor(
    private readonly settings: DemoSettingsStore,
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
    private readonly sms: SmsSender,
    private readonly events: ProcessedEventStore
  ) {}

  execute(): LabState {
    return {
      settings: this.settings.get(),
      orders: this.orders.list(),
      payments: this.payments.list(),
      sms: this.sms.list(),
      processedEvents: this.events.list(),
    };
  }
}
