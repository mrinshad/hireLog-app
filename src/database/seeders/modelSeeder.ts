import { SQLiteDatabase } from 'expo-sqlite';
import { errorLogger } from '@/services/logging/errorLogger';

export interface SeedModelDef {
  modelId: string;
  displayName: string;
  isDefault: number;
  displayOrder: number;
}

export const OFFICIAL_GEMINI_MODELS: SeedModelDef[] = [
  {
    modelId: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash (Recommended)',
    isDefault: 1,
    displayOrder: 1,
  },
  {
    modelId: 'gemini-3.7-flash',
    displayName: 'Gemini 3.7 Flash (Hybrid Reasoning)',
    isDefault: 0,
    displayOrder: 2,
  },
  {
    modelId: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    isDefault: 0,
    displayOrder: 3,
  },
  {
    modelId: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash Lite (High Throughput)',
    isDefault: 0,
    displayOrder: 4,
  },
  {
    modelId: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash Lite',
    isDefault: 0,
    displayOrder: 5,
  },
  {
    modelId: 'gemini-3.1-pro',
    displayName: 'Gemini 3.1 Pro (Deep Complex Tasks)',
    isDefault: 0,
    displayOrder: 6,
  },
  {
    modelId: 'gemini-3-flash',
    displayName: 'Gemini 3 Flash',
    isDefault: 0,
    displayOrder: 7,
  },
  {
    modelId: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    isDefault: 0,
    displayOrder: 8,
  },
  {
    modelId: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    isDefault: 0,
    displayOrder: 9,
  },
  {
    modelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    isDefault: 0,
    displayOrder: 10,
  },
  {
    modelId: 'gemini-2-flash',
    displayName: 'Gemini 2 Flash',
    isDefault: 0,
    displayOrder: 11,
  },
  {
    modelId: 'gemini-2-flash-lite',
    displayName: 'Gemini 2 Flash Lite',
    isDefault: 0,
    displayOrder: 12,
  },
  {
    modelId: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash (Legacy)',
    isDefault: 0,
    displayOrder: 13,
  },
  {
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro (Legacy)',
    isDefault: 0,
    displayOrder: 14,
  },
];

/**
 * Seeds all official text-generation models from Google AI Studio into SQLite ai_models table.
 * Uses INSERT OR IGNORE / ON CONFLICT to ensure dynamic data without duplicates.
 */
export async function seedAiModels(db: SQLiteDatabase): Promise<void> {
  try {
    for (const m of OFFICIAL_GEMINI_MODELS) {
      const id = `model_${m.modelId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await db.runAsync(
        `INSERT INTO ai_models (id, provider, model_id, display_name, is_default, display_order)
         VALUES (?, 'google_gemini', ?, ?, ?, ?)
         ON CONFLICT(model_id) DO UPDATE SET
           display_name = excluded.display_name,
           display_order = excluded.display_order;`,
        id,
        m.modelId,
        m.displayName,
        m.isDefault,
        m.displayOrder
      );
    }
  } catch (err: any) {
    await errorLogger.logError('seedAiModels', err);
    console.warn('Failed to seed AI models into database:', err);
  }
}
