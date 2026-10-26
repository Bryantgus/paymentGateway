import type { DatabaseSync } from 'node:sqlite';
import type { UnitOfWork } from '../../../application/ports/unit-of-work';

export class SqliteUnitOfWork implements UnitOfWork {
  constructor(private readonly db: DatabaseSync) {}

  run<T>(work: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK'); // undoes everything written inside `work`
      throw err;
    }
  }
}
