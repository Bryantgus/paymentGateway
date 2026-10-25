import type { Logger } from '../../application/ports/logger';

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  error(message: string, cause?: unknown): void {
    const detail = cause instanceof Error ? cause.message : cause;
    if (detail) console.error(message, detail);
    else console.error(message);
  }
}
