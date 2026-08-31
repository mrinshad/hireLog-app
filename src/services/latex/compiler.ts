import * as FileSystem from 'expo-file-system/legacy';
import { settingsRepository } from '@/database/repositories/settingsRepository';

const DEFAULT_PUBLIC_COMPILER = 'https://latexonline.cc/compile';

export class CompilerError extends Error {
  compilerLog: string;

  constructor(message: string, compilerLog: string = '') {
    super(message);
    this.name = 'CompilerError';
    this.compilerLog = compilerLog;
  }
}

/**
 * Converts an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const latexCompiler = {
  /**
   * Compiles LaTeX source code into a PDF file and saves it to local device storage.
   */
  async compileToPdf(
    latexSource: string,
    jobId: string,
    versionId: string
  ): Promise<{ pdfPath: string; sizeBytes: number }> {
    if (!latexSource || !latexSource.trim()) {
      throw new CompilerError('LaTeX source is empty.', 'Empty LaTeX document.');
    }

    // 1. Resolve Compiler Endpoint
    const customUrl = await settingsRepository.getSetting('latex_compiler_url');
    const compilerEndpoint = (customUrl && customUrl.trim()) || DEFAULT_PUBLIC_COMPILER;

    // 2. Prepare HTTP request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout

    let response: Response;
    try {
      if (compilerEndpoint.includes('latexonline.cc')) {
        // latexonline accepts POST with text/plain body or URL encoded
        response = await fetch(`${DEFAULT_PUBLIC_COMPILER}?text=${encodeURIComponent(latexSource)}`, {
          method: 'GET',
          signal: controller.signal,
        });
      } else {
        // Standard JSON or raw POST for custom/local companion server
        response = await fetch(compilerEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latex: latexSource }),
          signal: controller.signal,
        });
      }
    } catch (networkError: any) {
      clearTimeout(timeoutId);
      if (networkError.name === 'AbortError' || controller.signal.aborted) {
        throw new CompilerError(
          'LaTeX compilation timed out after 50 seconds. Please check your connection and retry.',
          'Request timed out.'
        );
      }
      throw new CompilerError(
        'Could not reach LaTeX compilation service. Please check your internet connection or custom compiler URL in Settings.',
        networkError.message || 'Network connection failed.'
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // 3. Handle compilation response
    if (!response.ok) {
      let errorLog = '';
      try {
        errorLog = await response.text();
      } catch {
        errorLog = `Compiler returned HTTP status ${response.status}`;
      }

      throw new CompilerError(
        'LaTeX compilation failed. Please review the error log or adjust resume details.',
        errorLog
      );
    }

    // 4. Extract PDF bytes
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength < 50) {
      throw new CompilerError(
        'The compiler returned an invalid or empty PDF file.',
        'Zero-length or corrupted PDF buffer received.'
      );
    }

    const base64Data = arrayBufferToBase64(arrayBuffer);

    // 5. Store PDF locally in structured directory
    const dir = `${FileSystem.documentDirectory}resumes/${jobId}/`;
    const targetFilePath = `${dir}${versionId}.pdf`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      await FileSystem.writeAsStringAsync(targetFilePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileInfo = await FileSystem.getInfoAsync(targetFilePath);

      return {
        pdfPath: targetFilePath,
        sizeBytes: (fileInfo as any).size || arrayBuffer.byteLength,
      };
    } catch (fsError: any) {
      throw new CompilerError(
        `Failed to save compiled PDF to local storage: ${fsError.message}`,
        fsError.stack || String(fsError)
      );
    }
  },
};
