import { settingsRepository } from '@/database/repositories/settingsRepository';

const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export interface GeminiRequestOptions {
  systemInstruction?: string;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
}

export class GeminiError extends Error {
  code: 'MISSING_API_KEY' | 'NETWORK_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'UNKNOWN';

  constructor(
    message: string,
    code: 'MISSING_API_KEY' | 'NETWORK_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

export const geminiClient = {
  /**
   * Sends a structured JSON prompt to Gemini with automatic model fallback.
   */
  async generateJson<T>(prompt: string, options: GeminiRequestOptions = {}): Promise<T> {
    const apiKey = await settingsRepository.getGeminiApiKey();

    if (!apiKey) {
      throw new GeminiError(
        'Gemini API Key is not configured. Please add your API key in Settings or set EXPO_PUBLIC_GEMINI_API_KEY in .env.',
        'MISSING_API_KEY'
      );
    }

    const customModel = (await settingsRepository.getSetting('gemini_model')) || process.env.EXPO_PUBLIC_GEMINI_MODEL;
    const candidateModels = options.model
      ? [options.model]
      : customModel && customModel.trim()
      ? [customModel.trim(), ...DEFAULT_MODELS.filter((m) => m !== customModel.trim())]
      : DEFAULT_MODELS;

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        return await this.executeModelRequest<T>(model, apiKey, prompt, options);
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        // If the model is not found, deprecated, or unavailable, try next candidate
        const isModelUnavailable =
          msg.includes('no longer available') ||
          msg.includes('not found') ||
          msg.includes('unsupported') ||
          msg.includes('404') ||
          msg.includes('deprecated');

        if (isModelUnavailable && candidateModels.indexOf(model) < candidateModels.length - 1) {
          console.warn(`Gemini model ${model} unavailable, falling back to next candidate...`);
          continue;
        }

        throw err;
      }
    }

    throw lastError || new GeminiError('Failed to generate response from Gemini API.', 'UNKNOWN');
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

        if (response.status === 401 || response.status === 403) {
          throw new GeminiError(
            'Invalid or unauthorized Gemini API key. Please check your key in Settings.',
            'AUTH_ERROR'
          );
        } else if (response.status === 429) {
          throw new GeminiError(
            'Gemini API rate limit exceeded. Please wait a moment and retry.',
            'RATE_LIMIT'
          );
        } else {
          throw new GeminiError(`Gemini API Error: ${errorMessage}`, 'UNKNOWN');
        }
      }

      const responseData = await response.json();
      const textOutput = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new GeminiError('Gemini returned an empty response.', 'INVALID_RESPONSE');
      }

      try {
        return JSON.parse(textOutput) as T;
      } catch {
        throw new GeminiError(
          'Failed to parse JSON response from Gemini API.',
          'INVALID_RESPONSE'
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error instanceof GeminiError) {
        throw error;
      }

      if (error.name === 'AbortError' || controller.signal.aborted) {
        throw new GeminiError(
          'Gemini API request timed out after 35 seconds. Please check your connection and retry.',
          'TIMEOUT'
        );
      }

      throw new GeminiError(
        'Could not connect to Gemini API. Please check your internet connection and try again.',
        'NETWORK_ERROR'
      );
    }
  },
};
