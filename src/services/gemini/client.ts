import { settingsRepository } from '@/database/repositories/settingsRepository';

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

let cachedActiveModels: string[] | null = null;
let lastDiscoveryTime = 0;

async function discoverActiveModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedActiveModels && cachedActiveModels.length > 0 && now - lastDiscoveryTime < 1000 * 60 * 30) {
    return cachedActiveModels;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const supported = data.models
          .filter(
            (m: any) =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent')
          )
          .map((m: any) => m.name.replace(/^models\//, ''));

        // Rank models: flash first, then pro, newest first
        const flashModels = supported
          .filter((m: string) => m.includes('flash'))
          .sort((a: string, b: string) => b.localeCompare(a));
        const otherModels = supported
          .filter((m: string) => !m.includes('flash'))
          .sort((a: string, b: string) => b.localeCompare(a));

        const combined = [...flashModels, ...otherModels];
        if (combined.length > 0) {
          cachedActiveModels = combined;
          lastDiscoveryTime = now;
          return combined;
        }
      }
    }
  } catch (err) {
    console.warn('Dynamic Gemini model discovery fallback:', err);
  }

  return DEFAULT_MODELS;
}

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
      | 'TIMEOUT'
      | 'INVALID_RESPONSE'
      | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

export const geminiClient = {
  /**
   * Sends a structured JSON prompt to Gemini with dynamic model discovery and automatic fallback.
   */
  async generateJson<T>(prompt: string, options: GeminiRequestOptions = {}): Promise<T> {
    const apiKey = await settingsRepository.getGeminiApiKey();

    if (!apiKey) {
      throw new GeminiError(
        'Gemini API Key is not configured. Please add your API key in Settings.',
        'MISSING_API_KEY'
      );
    }

    const customModel =
      (await settingsRepository.getSetting('gemini_model')) ||
      process.env.EXPO_PUBLIC_GEMINI_MODEL;

    let candidateModels: string[];
    if (options.model) {
      candidateModels = [options.model];
    } else if (customModel && customModel.trim()) {
      candidateModels = [customModel.trim(), ...DEFAULT_MODELS.filter((m) => m !== customModel.trim())];
    } else {
      const discovered = await discoverActiveModels(apiKey);
      candidateModels = discovered.length > 0 ? discovered : DEFAULT_MODELS;
    }

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        return await this.executeModelRequest<T>(model, apiKey, prompt, options);
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        const isModelUnavailable =
          msg.includes('no longer available') ||
          msg.includes('not found') ||
          msg.includes('unsupported') ||
          msg.includes('404') ||
          msg.includes('deprecated');

        if (isModelUnavailable && candidateModels.indexOf(model) < candidateModels.length - 1) {
          console.warn(`Gemini model ${model} unavailable, trying next candidate...`);
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
