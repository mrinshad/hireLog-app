import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE resume_versions ADD COLUMN pdf_path TEXT DEFAULT NULL;
    ALTER TABLE resume_versions ADD COLUMN generation_status TEXT NOT NULL DEFAULT 'Generated';
    ALTER TABLE resume_versions ADD COLUMN error_log TEXT DEFAULT NULL;
  `);
}
