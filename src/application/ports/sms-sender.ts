export interface SmsRecord {
  id: number;
  orderId: number;
  message: string;
  sentAt: string;
}

/** Sends confirmation SMS messages. It is an external effect: once sent, it cannot be undone. */
export interface SmsSender {
  send(orderId: number, message: string): Promise<void>;
  list(): SmsRecord[];
}
