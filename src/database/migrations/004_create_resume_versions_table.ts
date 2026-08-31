import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      target_role TEXT NOT NULL DEFAULT '',
      target_company TEXT NOT NULL DEFAULT '',
      latex_source TEXT NOT NULL,
      resume_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_resume_versions_job_id ON resume_versions(job_id);
    CREATE INDEX IF NOT EXISTS idx_resume_versions_created_at ON resume_versions(created_at DESC);
  `);
}
