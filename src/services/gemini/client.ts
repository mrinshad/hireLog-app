import { settingsRepository } from '@/database/repositories/settingsRepository';

const GEMINI_API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiRequestOptions {
  systemInstruction?: string;
  temperature?: number;
  timeoutMs?: number;
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
   * Sends a structured JSON prompt to Gemini 2.5 Flash.
   */
  async generateJson<T>(prompt: string, options: GeminiRequestOptions = {}): Promise<T> {
    const apiKey = await settingsRepository.getGeminiApiKey();

    if (!apiKey) {
      throw new GeminiError(
        'Gemini API Key is not configured. Please add your API key in Settings or set EXPO_PUBLIC_GEMINI_API_KEY in .env.',
        'MISSING_API_KEY'
      );
    }

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
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
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
