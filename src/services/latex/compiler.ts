import * as FileSystem from 'expo-file-system/legacy';
import { settingsRepository } from '@/database/repositories/settingsRepository';

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
   * Compiles LaTeX source code into a PDF file using a multi-service fallback pool.
   */
  async compileToPdf(
    latexSource: string,
    jobId: string,
    versionId: string
  ): Promise<{ pdfPath: string; sizeBytes: number }> {
    if (!latexSource || !latexSource.trim()) {
      throw new CompilerError('LaTeX source is empty.', 'Empty LaTeX document.');
    }

    const customUrl = await settingsRepository.getSetting('latex_compiler_url');

    // Build ordered list of compilation strategies
    const strategies: Array<{ name: string; compile: () => Promise<ArrayBuffer> }> = [];

    if (customUrl && customUrl.trim()) {
      strategies.push({
        name: 'Custom User Endpoint',
        compile: () => this.compileCustomEndpoint(customUrl.trim(), latexSource),
      });
    }

    // Candidate 1: Rtex API (Fast, dedicated LaTeX compile engine)
    strategies.push({
      name: 'Rtex Engine',
      compile: () => this.compileRtex(latexSource),
    });

    // Candidate 2: LaTeXOnline.cc
    strategies.push({
      name: 'LaTeX Online',
      compile: () => this.compileLatexOnline(latexSource),
    });

    let lastError: Error | null = null;
    let compiledBuffer: ArrayBuffer | null = null;

    for (const strategy of strategies) {
      try {
        console.log(`Attempting LaTeX compilation via ${strategy.name}...`);
        compiledBuffer = await strategy.compile();
        if (compiledBuffer && compiledBuffer.byteLength > 100) {
          console.log(`LaTeX compilation succeeded via ${strategy.name} (${compiledBuffer.byteLength} bytes)`);
          break;
        }
      } catch (err: any) {
        console.warn(`Compilation failed via ${strategy.name}:`, err.message || err);
        lastError = err;
      }
    }

    if (!compiledBuffer || compiledBuffer.byteLength < 100) {
      throw (
        lastError ||
        new CompilerError(
          'LaTeX compilation service is currently unreachable. Please check your internet connection or configure a custom compiler endpoint in Settings.',
          'All compiler endpoints failed.'
        )
      );
    }

    const base64Data = arrayBufferToBase64(compiledBuffer);

    // Save PDF locally in structured hireFlow directory
    const dir = `${FileSystem.documentDirectory}hireFlow/resumes/`;
    const safeJob = (jobId || 'application').replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetFilePath = `${dir}${safeJob}_${versionId}.pdf`;

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
        sizeBytes: (fileInfo as any).size || compiledBuffer.byteLength,
      };
    } catch (fsError: any) {
      throw new CompilerError(
        `Failed to save compiled PDF to local storage: ${fsError.message}`,
        fsError.stack || String(fsError)
      );
    }
  },

  /**
   * Compiles using the Rtex API v2.
   */
  async compileRtex(latexSource: string): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch('https://rtex.probablyfine.co.uk/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: latexSource, format: 'pdf' }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Rtex returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status !== 'success' || !data.filename) {
        throw new Error(data.log || 'Rtex compilation failed.');
      }

      const downloadController = new AbortController();
      const downloadTimer = setTimeout(() => downloadController.abort(), 20000);

      const pdfRes = await fetch(`https://rtex.probablyfine.co.uk/api/v2/${data.filename}`, {
        signal: downloadController.signal,
      });

      clearTimeout(downloadTimer);

      if (!pdfRes.ok) {
        throw new Error(`Failed to download PDF from Rtex: HTTP ${pdfRes.status}`);
      }

      return await pdfRes.arrayBuffer();
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  },

  /**
   * Compiles using LaTeX Online service safely without URI length overflow.
   */
  async compileLatexOnline(latexSource: string): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch('https://latexonline.cc/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `text=${encodeURIComponent(latexSource)}`,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`LaTeXOnline returned HTTP ${res.status}`);
      }

      return await res.arrayBuffer();
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  },

  /**
   * Compiles using a custom endpoint.
   */
  async compileCustomEndpoint(url: string, latexSource: string): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: latexSource }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Custom compiler returned HTTP ${res.status}`);
      }

      return await res.arrayBuffer();
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  },
};
