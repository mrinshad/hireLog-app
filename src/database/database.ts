import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';
import { seedAiModels } from './seeders/modelSeeder';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await openDatabaseAsync('hirelog.db');

    // Configure SQLite pragmas for performance & data integrity
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    // Run schema migrations
    await runMigrations(db);

    // Seed dynamic AI models catalog from Google AI Studio
    await seedAiModels(db);

    dbInstance = db;
    return db;
  })();

  return initPromise;
}
