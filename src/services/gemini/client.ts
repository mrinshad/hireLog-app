import { apiKeyRepository } from '@/database/repositories/apiKeyRepository';
import { settingsRepository } from '@/database/repositories/settingsRepository';
import { errorLogger } from '@/services/logging/errorLogger';
import { OFFICIAL_GEMINI_MODELS } from '@/database/seeders/modelSeeder';

export interface GeminiRequestOptions {
  systemInstruction?: string;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
}

export class GeminiError extends Error {
  code:
    | 'MISSING_API_KEY'
    | 'NETWORK_ERROR'
    | 'AUTH_ERROR'
    | 'RATE_LIMIT'
    | 'PREPAYMENT_DEPLETED'
    | 'TIMEOUT'
    | 'INVALID_RESPONSE'
    | 'UNKNOWN';

  constructor(
    message: string,
    code:
      | 'MISSING_API_KEY'
      | 'NETWORK_ERROR'
      | 'AUTH_ERROR'
      | 'RATE_LIMIT'
      | 'PREPAYMENT_DEPLETED'
      | 'TIMEOUT'
      | 'INVALID_RESPONSE'
      | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

export interface ModelDiagnosticResult {
  modelId: string;
  displayName: string;
  status: 'ok' | 'rate_limited' | 'credits_depleted' | 'auth_error' | 'not_found' | 'error';
  latencyMs: number;
  message: string;
}

export interface ApiKeyDiagnosticReport {
  testedKey: string;
  overallStatus: 'all_ok' | 'some_ok' | 'rate_limited' | 'auth_failed' | 'failed';
  optimalModel: string | null;
  results: ModelDiagnosticResult[];
}

export const geminiClient = {
  /**
   * Diagnoses an API key across available models with ultra-minimal token usage (<10 tokens).
   */
  async diagnoseApiKey(
    apiKey: string,
    candidateModels?: string[]
  ): Promise<ApiKeyDiagnosticReport> {
    if (!apiKey || !apiKey.trim()) {
      throw new GeminiError('API Key cannot be empty.', 'MISSING_API_KEY');
    }

    const key = apiKey.trim();
    let modelsToTest = candidateModels;

    if (!modelsToTest || modelsToTest.length === 0) {
      try {
        const allDbModels = await apiKeyRepository.getAllModels();
        modelsToTest = allDbModels.map((m) => m.modelId);
      } catch {
        modelsToTest = OFFICIAL_GEMINI_MODELS.map((m) => m.modelId);
      }
    }

    if (!modelsToTest || modelsToTest.length === 0) {
      modelsToTest = OFFICIAL_GEMINI_MODELS.map((m) => m.modelId);
    }

    const results: ModelDiagnosticResult[] = [];
    let optimalModel: string | null = null;

    for (const model of modelsToTest) {
      const startTime = Date.now();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const requestBody = {
        contents: [{ parts: [{ text: '{"p":1}' }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 10,
          temperature: 0.1,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (response.ok) {
          results.push({
            modelId: model,
            displayName: model,
            status: 'ok',
            latencyMs,
            message: `Active (${latencyMs}ms)`,
          });
          if (!optimalModel) {
            optimalModel = model;
          }
        } else {
          let errorJson: any = null;
          try {
            errorJson = await response.json();
          } catch {}

          const rawMsg = errorJson?.error?.message || `HTTP ${response.status}`;

          if (rawMsg.includes('prepayment credits are depleted')) {
            results.push({
              modelId: model,
              displayName: model,
              status: 'credits_depleted',
              latencyMs,
              message: 'Google AI credits depleted',
            });
          } else if (response.status === 429 || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
            results.push({
              modelId: model,
              displayName: model,
              status: 'rate_limited',
              latencyMs,
              message: 'Quota / Rate limit exceeded',
            });
          } else if (response.status === 401 || response.status === 403 || rawMsg.includes('API_KEY_INVALID')) {
            results.push({
              modelId: model,
              displayName: model,
              status: 'auth_error',
              latencyMs,
              message: 'Invalid API key or unauthorized',
            });
          } else if (response.status === 404 || rawMsg.includes('not found')) {
            results.push({
              modelId: model,
              displayName: model,
              status: 'not_found',
              latencyMs,
              message: 'Model unsupported for this key tier',
            });
          } else {
            results.push({
              modelId: model,
              displayName: model,
              status: 'error',
              latencyMs,
              message: rawMsg,
            });
          }
        }
      } catch (reqErr: any) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        results.push({
          modelId: model,
          displayName: model,
          status: 'error',
          latencyMs,
          message: reqErr.name === 'AbortError' ? 'Timed out (8s)' : reqErr.message || 'Network error',
        });
      }
    }

    const hasAuthError = results.some((r) => r.status === 'auth_error');
    const okCount = results.filter((r) => r.status === 'ok').length;

    let overallStatus: ApiKeyDiagnosticReport['overallStatus'] = 'failed';
    if (hasAuthError && okCount === 0) {
      overallStatus = 'auth_failed';
    } else if (okCount === results.length && okCount > 0) {
      overallStatus = 'all_ok';
    } else if (okCount > 0) {
      overallStatus = 'some_ok';
    } else if (results.some((r) => r.status === 'rate_limited')) {
      overallStatus = 'rate_limited';
    }

    return {
      testedKey: key,
      overallStatus,
      optimalModel,
      results,
    };
  },

  /**
   * Sends a structured JSON prompt directly to Gemini using the active API key and configured model.
   */
  async generateJson<T>(prompt: string, options: GeminiRequestOptions = {}): Promise<T> {
    const activeKeyItem = await apiKeyRepository.getActiveApiKey();
    const apiKey = activeKeyItem?.apiKey || (await settingsRepository.getGeminiApiKey());

    if (!apiKey || !apiKey.trim()) {
      throw new GeminiError(
        'Gemini API Key is not configured. Please add your API key in Settings > AI & API Keys.',
        'MISSING_API_KEY'
      );
    }

    // Resolve target model directly from active key or system default
    let targetModel = options.model || activeKeyItem?.defaultModel;

    if (!targetModel) {
      try {
        const allModels = await apiKeyRepository.getAllModels();
        const defaultDbModel = allModels.find((m) => m.isDefault);
        targetModel = defaultDbModel?.modelId || allModels[0]?.modelId;
      } catch {}
    }

    if (!targetModel) {
      targetModel = (await settingsRepository.getSetting('gemini_model')) || 'gemini-2.5-flash';
    }

    return await this.executeModelRequest<T>(targetModel.trim(), apiKey.trim(), prompt, options);
  },

  /**
   * Executes a single request for a given model.
   */
  async executeModelRequest<T>(
    model: string,
    apiKey: string,
    prompt: string,
    options: GeminiRequestOptions
  ): Promise<T> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const { systemInstruction, temperature = 0.1, timeoutMs = 35000 } = options;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature,
      },
      ...(systemInstruction
        ? {
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          }
        : {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // ignore
        }

        const errorMessage =
          errorData?.error?.message || `Gemini API returned error code ${response.status}`;

        if (errorMessage.includes('prepayment credits are depleted')) {
          throw new GeminiError(
            'Your Google AI Studio project credits are depleted. Please top up your balance at https://ai.studio or generate a new API key from a free-tier Google AI Studio project.',
            'PREPAYMENT_DEPLETED'
          );
        } else if (response.status === 401 || response.status === 403) {
          throw new GeminiError(
            'Invalid or unauthorized Gemini API key. Please check your key in Settings.',
            'AUTH_ERROR'
          );
        } else if (response.status === 429) {
          throw new GeminiError(
            'Gemini API rate limit exceeded. Please wait a moment and retry.',
            'RATE_LIMIT'
          );
        } else if (response.status === 404 || errorMessage.includes('not found')) {
          throw new GeminiError(`Gemini model ${model} not found: ${errorMessage}`, 'UNKNOWN');
        }

        throw new GeminiError(`Gemini API Error: ${errorMessage}`, 'UNKNOWN');
      }

      const data = await response.json();
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new GeminiError(
          'Gemini returned an empty response or unexpected format.',
          'INVALID_RESPONSE'
        );
      }

      try {
        const cleanedText = textResponse
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '');
        return JSON.parse(cleanedText) as T;
      } catch (parseError) {
        throw new GeminiError(
          'Failed to parse JSON response from Gemini API.',
          'INVALID_RESPONSE'
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      await errorLogger.logError('geminiClient.executeModelRequest', error, {
        model,
        endpoint,
      });

      if (error instanceof GeminiError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new GeminiError(
          `Gemini request timed out after ${timeoutMs / 1000}s. Please check your internet connection.`,
          'TIMEOUT'
        );
      }

      throw new GeminiError(
        `Gemini Network Error: ${error.message || 'Failed to communicate with Gemini API.'}`,
        'NETWORK_ERROR'
      );
    }
  },
};
