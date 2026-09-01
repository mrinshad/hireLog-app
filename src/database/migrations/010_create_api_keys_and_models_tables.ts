import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  // 1. Table for API Keys
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'google_gemini',
      label TEXT NOT NULL,
      api_key TEXT NOT NULL,
      default_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Table for AI Models
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'google_gemini',
      model_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 3. Seed standard compatible models
  const initialModels = [
    {
      id: 'model_gemini_2_5_flash',
      modelId: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash (Recommended)',
      isDefault: 1,
      order: 1,
    },
    {
      id: 'model_gemini_2_5_pro',
      modelId: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro (Deep Reasoning)',
      isDefault: 0,
      order: 2,
    },
    {
      id: 'model_gemini_1_5_flash',
      modelId: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash (Legacy Fast)',
      isDefault: 0,
      order: 3,
    },
    {
      id: 'model_gemini_1_5_pro',
      modelId: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro (Legacy Pro)',
      isDefault: 0,
      order: 4,
    },
    {
      id: 'model_gemini_3_6_flash',
      modelId: 'gemini-3.6-flash',
      displayName: 'Gemini 3.6 Flash (Preview)',
      isDefault: 0,
      order: 5,
    },
    {
      id: 'model_gemini_3_5_flash_lite',
      modelId: 'gemini-3.5-flash-lite',
      displayName: 'Gemini 3.5 Flash Lite (Ultra Lightweight)',
      isDefault: 0,
      order: 6,
    },
  ];

  for (const m of initialModels) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ai_models (id, provider, model_id, display_name, is_default, display_order)
       VALUES (?, 'google_gemini', ?, ?, ?, ?);`,
      m.id,
      m.modelId,
      m.displayName,
      m.isDefault,
      m.order
    );
  }

  // 4. If an existing Gemini API key is stored in app_settings table, migrate it into api_keys table
  try {
    const existingKeyRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'gemini_api_key';"
    );
    if (existingKeyRow && existingKeyRow.value && existingKeyRow.value.trim()) {
      const id = `key_${Date.now()}`;
      await db.runAsync(
        `INSERT OR IGNORE INTO api_keys (id, provider, label, api_key, default_model, is_active)
         VALUES (?, 'google_gemini', 'Primary Gemini Key', ?, 'gemini-2.5-flash', 1);`,
        id,
        existingKeyRow.value.trim()
      );
    }
  } catch (err) {
    console.warn('Existing key migration skipped:', err);
  }
}
