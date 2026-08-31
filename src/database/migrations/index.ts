import { SQLiteDatabase } from 'expo-sqlite';

import { up as migration001 } from './001_create_profile_tables';
import { up as migration002 } from './002_create_jobs_table';
import { up as migration003 } from './003_add_job_analysis_and_settings';
import { up as migration004 } from './004_create_resume_versions_table';
import { up as migration005 } from './005_add_pdf_to_resume_versions';
import { up as migration006 } from './006_create_email_drafts_table';
import { up as migration007 } from './007_add_applied_at_and_status_history';

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
  {
    version: 3,
    name: '003_add_job_analysis_and_settings',
    up: migration003,
  },
  {
    version: 4,
    name: '004_create_resume_versions_table',
    up: migration004,
  },
  {
    version: 5,
    name: '005_add_pdf_to_resume_versions',
    up: migration005,
  },
  {
    version: 6,
    name: '006_create_email_drafts_table',
    up: migration006,
  },
  {
    version: 7,
    name: '007_add_applied_at_and_status_history',
    up: migration007,
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
