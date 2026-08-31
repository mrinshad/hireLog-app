import { getDatabase } from '../database';

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export const settingsRepository = {
  /**
   * Retrieves a setting by key.
   */
  async getSetting(key: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT key, value, updated_at FROM app_settings WHERE key = ?;',
      key
    );
    return row ? row.value : null;
  },

  /**
   * Sets or updates a setting by key.
   */
  async setSetting(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = datetime('now');`,
      key,
      value
    );
  },

  /**
   * Retrieves the configured Gemini API key (from SQLite or environment variable).
   */
  async getGeminiApiKey(): Promise<string> {
    const stored = await this.getSetting('gemini_api_key');
    if (stored && stored.trim()) {
      return stored.trim();
    }
    const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    return envKey ? envKey.trim() : '';
  },

  /**
   * Stores the Gemini API key in SQLite.
   */
  async setGeminiApiKey(apiKey: string): Promise<void> {
    await this.setSetting('gemini_api_key', apiKey.trim());
  },
};
