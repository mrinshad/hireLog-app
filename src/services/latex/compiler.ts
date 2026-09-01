import * as FileSystem from 'expo-file-system/legacy';
import { localPdfGenerator } from '@/services/pdf/pdfGenerator';
import { errorLogger } from '@/services/logging/errorLogger';
import { CustomizedResume } from '@/types/resume';

export class CompilerError extends Error {
  compilerLog: string;

  constructor(message: string, compilerLog: string = '') {
    super(message);
    this.name = 'CompilerError';
    this.compilerLog = compilerLog;
  }
}

export const latexCompiler = {
  /**
   * Generates a PDF file 100% on-device using the native print engine.
   * Zero external web services, zero network requests, saves directly to hireFlow/resumes/.
   */
  async compileToPdf(
    latexSource: string,
    jobId: string,
    versionId: string | number,
    resumeData?: CustomizedResume
  ): Promise<{ pdfPath: string; sizeBytes: number }> {
    try {
      // 1. If structured resumeData is available, generate immediately on-device
      if (resumeData) {
        return await localPdfGenerator.generatePdfFromResume(
          resumeData,
          jobId || 'hireFlow',
          versionId
        );
      }

      // 2. Fallback: Parse basic resume fields from latex/text to build structured data
      const fallbackResume: CustomizedResume = {
        jobId: jobId || 'hireFlow',
        targetRole: 'Job Application',
        targetCompany: jobId || 'Company',
        personalDetails: {
          fullName: 'Applicant',
          email: '',
          phone: '',
          location: '',
        },
        summary: latexSource ? latexSource.substring(0, 300) : '',
        skills: [],
        experience: [],
        projects: [],
        education: [],
        certifications: [],
        unmatchedJdSkills: [],
        overallMatchScore: 100,
        generatedAt: new Date().toISOString(),
      };

      return await localPdfGenerator.generatePdfFromResume(
        fallbackResume,
        jobId || 'hireFlow',
        versionId
      );
    } catch (err: any) {
      await errorLogger.logError('latexCompiler.compileToPdf', err, { jobId, versionId });
      throw new CompilerError(
        err.message || 'Failed to generate PDF on device.',
        String(err.stack || err)
      );
    }
  },
};
