import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE jobs ADD COLUMN workflow_state TEXT NOT NULL DEFAULT 'CREATED';
    ALTER TABLE jobs ADD COLUMN workflow_failed_step TEXT DEFAULT NULL;
    ALTER TABLE jobs ADD COLUMN workflow_error_message TEXT DEFAULT NULL;
    ALTER TABLE jobs ADD COLUMN approved_resume_version_id TEXT DEFAULT NULL;
    ALTER TABLE jobs ADD COLUMN resume_approved_at TEXT DEFAULT NULL;
    ALTER TABLE jobs ADD COLUMN match_json TEXT DEFAULT NULL;

    CREATE INDEX IF NOT EXISTS idx_jobs_workflow_state ON jobs(workflow_state);
  `);
}
