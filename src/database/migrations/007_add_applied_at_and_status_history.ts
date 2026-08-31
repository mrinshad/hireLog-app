import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE jobs ADD COLUMN applied_at TEXT DEFAULT NULL;

    CREATE TABLE IF NOT EXISTS job_status_history (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_status_history_job_id ON job_status_history(job_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON job_status_history(changed_at);
  `);
}
