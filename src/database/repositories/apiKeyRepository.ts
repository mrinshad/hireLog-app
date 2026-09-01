import { getDatabase } from '../database';
import { errorLogger } from '@/services/logging/errorLogger';

export interface ApiKeyItem {
  id: string;
  provider: string;
  label: string;
  apiKey: string;
  defaultModel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiModelItem {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
}

interface ApiKeyRow {
  id: string;
  provider: string;
  label: string;
  api_key: string;
  default_model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface AiModelRow {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  is_default: number;
  display_order: number;
  created_at: string;
}

function mapApiKeyRow(row: ApiKeyRow): ApiKeyItem {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    apiKey: row.api_key,
    defaultModel: row.default_model,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapModelRow(row: AiModelRow): AiModelItem {
  return {
    id: row.id,
    provider: row.provider,
    modelId: row.model_id,
    displayName: row.display_name,
    isDefault: Boolean(row.is_default),
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export const apiKeyRepository = {
  /**
   * Retrieves all configured API keys.
   */
  async getAllApiKeys(): Promise<ApiKeyItem[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<ApiKeyRow>(
        'SELECT * FROM api_keys ORDER BY is_active DESC, created_at DESC;'
      );
      return rows.map(mapApiKeyRow);
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.getAllApiKeys', err);
      return [];
    }
  },

  /**
   * Retrieves the currently active API key.
   */
  async getActiveApiKey(): Promise<ApiKeyItem | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<ApiKeyRow>(
        'SELECT * FROM api_keys WHERE is_active = 1 LIMIT 1;'
      );
      if (row) return mapApiKeyRow(row);

      // Fallback: check first available key if none explicitly active
      const firstRow = await db.getFirstAsync<ApiKeyRow>(
        'SELECT * FROM api_keys ORDER BY created_at DESC LIMIT 1;'
      );
      return firstRow ? mapApiKeyRow(firstRow) : null;
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.getActiveApiKey', err);
      return null;
    }
  },

  /**
   * Saves a new API key or updates an existing one.
   */
  async saveApiKey(params: {
    id?: string;
    provider?: string;
    label: string;
    apiKey: string;
    defaultModel?: string;
    isActive?: boolean;
  }): Promise<ApiKeyItem> {
    try {
      const db = await getDatabase();
      const id = params.id || `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const provider = params.provider || 'google_gemini';
      const defaultModel = params.defaultModel || 'gemini-2.5-flash';
      const isActive = params.isActive ? 1 : 0;
      const now = new Date().toISOString();

      // If this key is set to active, deactivate all others
      if (isActive) {
        await db.runAsync('UPDATE api_keys SET is_active = 0;');
      }

      // Check if there are no existing keys; if so, make this first key active
      const countRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM api_keys;'
      );
      const shouldBeActive = isActive || (countRow?.count || 0) === 0 ? 1 : 0;

      await db.runAsync(
        `INSERT INTO api_keys (id, provider, label, api_key, default_model, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           api_key = excluded.api_key,
           default_model = excluded.default_model,
           is_active = excluded.is_active,
           updated_at = excluded.updated_at;`,
        id,
        provider,
        params.label.trim(),
        params.apiKey.trim(),
        defaultModel.trim(),
        shouldBeActive,
        now,
        now
      );

      // Keep legacy app_settings table in sync for backward compatibility
      if (shouldBeActive) {
        try {
          await db.runAsync(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('gemini_api_key', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            params.apiKey.trim(),
            now
          );
          await db.runAsync(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('gemini_model', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            defaultModel.trim(),
            now
          );
        } catch (syncErr) {
          await errorLogger.logError('apiKeyRepository.saveApiKey.syncAppSettings', syncErr);
        }
      }

      return {
        id,
        provider,
        label: params.label.trim(),
        apiKey: params.apiKey.trim(),
        defaultModel: defaultModel.trim(),
        isActive: Boolean(shouldBeActive),
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.saveApiKey', err, { label: params.label });
      throw err;
    }
  },

  /**
   * Sets a specific key as the active key.
   */
  async setActiveApiKey(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      const now = new Date().toISOString();

      await db.runAsync('UPDATE api_keys SET is_active = 0;');
      await db.runAsync('UPDATE api_keys SET is_active = 1, updated_at = ? WHERE id = ?;', now, id);

      // Sync legacy app_settings
      const activeKey = await db.getFirstAsync<ApiKeyRow>(
        'SELECT * FROM api_keys WHERE id = ?;',
        id
      );
      if (activeKey) {
        try {
          await db.runAsync(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('gemini_api_key', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            activeKey.api_key,
            now
          );
          await db.runAsync(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('gemini_model', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            activeKey.default_model,
            now
          );
        } catch (syncErr) {
          await errorLogger.logError('apiKeyRepository.setActiveApiKey.syncAppSettings', syncErr);
        }
      }
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.setActiveApiKey', err, { keyId: id });
      throw err;
    }
  },

  /**
   * Deletes an API key.
   */
  async deleteApiKey(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      const toDelete = await db.getFirstAsync<ApiKeyRow>(
        'SELECT * FROM api_keys WHERE id = ?;',
        id
      );
      await db.runAsync('DELETE FROM api_keys WHERE id = ?;', id);

      // If active key was deleted, set the most recent remaining key as active
      if (toDelete?.is_active) {
        const remaining = await db.getFirstAsync<ApiKeyRow>(
          'SELECT * FROM api_keys ORDER BY created_at DESC LIMIT 1;'
        );
        if (remaining) {
          await this.setActiveApiKey(remaining.id);
        } else {
          try {
            await db.runAsync("DELETE FROM app_settings WHERE key = 'gemini_api_key';");
          } catch {}
        }
      }
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.deleteApiKey', err, { keyId: id });
      throw err;
    }
  },

  /**
   * Retrieves all available AI models from SQLite.
   */
  async getAllModels(): Promise<AiModelItem[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<AiModelRow>(
        'SELECT * FROM ai_models ORDER BY is_default DESC, display_order ASC, created_at ASC;'
      );
      return rows.map(mapModelRow);
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.getAllModels', err);
      return [];
    }
  },

  /**
   * Adds a new AI model dynamically.
   */
  async addModel(params: {
    modelId: string;
    displayName?: string;
    provider?: string;
    isDefault?: boolean;
  }): Promise<AiModelItem> {
    try {
      const db = await getDatabase();
      const id = `model_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const modelId = params.modelId.trim();
      const displayName = params.displayName?.trim() || modelId;
      const provider = params.provider || 'google_gemini';
      const isDefault = params.isDefault ? 1 : 0;
      const now = new Date().toISOString();

      if (isDefault) {
        await db.runAsync('UPDATE ai_models SET is_default = 0;');
      }

      await db.runAsync(
        `INSERT INTO ai_models (id, provider, model_id, display_name, is_default, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, 99, ?)
         ON CONFLICT(model_id) DO UPDATE SET
           display_name = excluded.display_name,
           is_default = excluded.is_default;`,
        id,
        provider,
        modelId,
        displayName,
        isDefault,
        now
      );

      return {
        id,
        provider,
        modelId,
        displayName,
        isDefault: Boolean(isDefault),
        displayOrder: 99,
        createdAt: now,
      };
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.addModel', err, { modelId: params.modelId });
      throw err;
    }
  },

  /**
   * Deletes an AI model.
   */
  async deleteModel(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM ai_models WHERE id = ?;', id);
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.deleteModel', err, { modelId: id });
      throw err;
    }
  },

  /**
   * Sets a model as the default model across the system.
   */
  async setDefaultModel(modelId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE ai_models SET is_default = 0;');
      await db.runAsync('UPDATE ai_models SET is_default = 1 WHERE model_id = ?;', modelId);
    } catch (err) {
      await errorLogger.logError('apiKeyRepository.setDefaultModel', err, { modelId });
      throw err;
    }
  },
};
