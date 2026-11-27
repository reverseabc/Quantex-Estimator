/**
 * An in-memory stand-in for a Cloudflare D1 binding, backed by Node's built-in SQLite.
 *
 * Implements the subset of the D1 API the Worker uses:
 * prepare(sql).bind(...params).first() / .all() / .run().
 * Each instance is a fresh database built from schema.sql, so tests never share state.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCHEMA_PATH = fileURLToPath(new URL('../../schema.sql', import.meta.url));

class FakeStatement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new FakeStatement(this.db, this.sql, params);
  }

  async first() {
    return this.db.prepare(this.sql).get(...this.params) ?? null;
  }

  async all() {
    return { results: this.db.prepare(this.sql).all(...this.params) };
  }

  async run() {
    const { changes } = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes } };
  }
}

export class FakeD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  }

  prepare(sql) {
    return new FakeStatement(this.db, sql);
  }
}
