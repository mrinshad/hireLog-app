import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  // Add analysis fields to jobs table
  await db.execAsync(`
    ALTER TABLE jobs ADD COLUMN analysis_status TEXT NOT NULL DEFAULT 'Not analyzed';
    ALTER TABLE jobs ADD COLUMN analysis_json TEXT DEFAULT NULL;
    ALTER TABLE jobs ADD COLUMN analysis_updated_at TEXT DEFAULT NULL;

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
