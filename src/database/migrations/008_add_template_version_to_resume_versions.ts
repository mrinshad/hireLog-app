import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE resume_versions ADD COLUMN template_version TEXT NOT NULL DEFAULT 'master-v1';
  `);
}
