import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Opens the database and creates the tables if they don't exist. A single connection is shared by all repositories,
 * so one transaction (`SqliteUnitOfWork`) covers the changes of every one of them.
 *
 * Note: `payments` has no UNIQUE constraint on the payment on purpose. A real system would have it as a second
 * safety net; here it is left out so that, without idempotency, the duplicated charge can be seen.
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name    TEXT    NOT NULL,
      amount          INTEGER NOT NULL,
      currency        TEXT    NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'pending',
      payment_id      TEXT,
      idempotency_key TEXT    UNIQUE,
      created_at      TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL,
      payment_id TEXT    NOT NULL,
      amount     INTEGER NOT NULL,
      currency   TEXT    NOT NULL,
      created_at TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS processed_events (
      event_id     TEXT PRIMARY KEY,
      processed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sms_log (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      message  TEXT    NOT NULL,
      sent_at  TEXT    NOT NULL
    );
  `);
  return db;
}
