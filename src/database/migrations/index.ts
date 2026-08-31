import { SQLiteDatabase } from 'expo-sqlite';

import { up as migration001 } from './001_create_profile_tables';
import { up as migration002 } from './002_create_jobs_table';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_create_profile_tables',
    up: migration001,
  },
  {
    version: 2,
    name: '002_create_jobs_table',
    up: migration002,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Create migration tracking table if not exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Query already applied migrations
  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // Run pending migrations in order
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?);',
        migration.version,
        migration.name
      );
    }
  }
}
