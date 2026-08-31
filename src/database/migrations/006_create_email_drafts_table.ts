import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS email_drafts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE,
      resume_version_id TEXT DEFAULT NULL,
      recipient TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      signature TEXT NOT NULL DEFAULT '',
      resume_file_path TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_email_drafts_job_id ON email_drafts(job_id);
  `);
}
