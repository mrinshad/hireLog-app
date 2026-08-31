import { getDatabase } from '../database';
import { ResumeGenerationStatus, ResumeLibraryItem, ResumeVersion } from '@/services/latex/types';
import { JobStatus } from '@/types/job';
import { CustomizedResume } from '@/types/resume';

interface ResumeVersionRow {
  id: string;
  job_id: string;
  version_number: number;
  template_version?: string | null;
  target_role: string;
  target_company: string;
  latex_source: string;
  resume_json: string;
  pdf_path?: string | null;
  generation_status?: string | null;
  error_log?: string | null;
  created_at: string;
  updated_at: string;
}

interface ResumeLibraryRow {
  id: string;
  job_id: string;
  version_number: number;
  template_version?: string | null;
  target_role: string;
  target_company: string;
  pdf_path?: string | null;
  generation_status?: string | null;
  created_at: string;
  updated_at: string;
  job_status?: string | null;
  job_company?: string | null;
  job_role?: string | null;
  is_approved?: number | boolean | null;
}

function mapRowToVersion(row: ResumeVersionRow): ResumeVersion {
  return {
    id: row.id,
    jobId: row.job_id,
    versionNumber: row.version_number,
    templateVersion: row.template_version || 'master-v1',
    targetRole: row.target_role,
    targetCompany: row.target_company,
    latexSource: row.latex_source,
    resumeJson: row.resume_json,
    pdfPath: row.pdf_path || null,
    generationStatus: (row.generation_status as ResumeGenerationStatus) || 'Generated',
    errorLog: row.error_log || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToLibraryItem(row: ResumeLibraryRow): ResumeLibraryItem {
  return {
    id: row.id,
    jobId: row.job_id,
    versionNumber: row.version_number,
    templateVersion: row.template_version || 'master-v1',
    targetRole: row.target_role || row.job_role || 'Software Engineer',
    targetCompany: row.target_company || row.job_company || 'Company',
    pdfPath: row.pdf_path || null,
    generationStatus: (row.generation_status as ResumeGenerationStatus) || 'Generated',
    jobStatus: (row.job_status as JobStatus) || null,
    jobCompany: row.job_company || null,
    jobRole: row.job_role || null,
    isApproved: !!row.is_approved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const resumeRepository = {
  /**
   * Saves a new version of the generated LaTeX resume in SQLite.
   */
  async saveResumeVersion(
    jobId: string,
    resume: CustomizedResume,
    latexSource: string,
    pdfPath: string | null = null,
    generationStatus: ResumeGenerationStatus = 'Generated',
    errorLog: string | null = null,
    templateVersion: string = 'master-v1'
  ): Promise<ResumeVersion> {
    const db = await getDatabase();
    const id = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Query current max version number for this job
    const maxRow = await db.getFirstAsync<{ max_ver: number | null }>(
      'SELECT MAX(version_number) as max_ver FROM resume_versions WHERE job_id = ?;',
      jobId
    );
    const nextVersionNumber = (maxRow?.max_ver || 0) + 1;

    const resumeJson = JSON.stringify(resume);

    await db.runAsync(
      `INSERT INTO resume_versions (id, job_id, version_number, template_version, target_role, target_company, latex_source, resume_json, pdf_path, generation_status, error_log, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      jobId,
      nextVersionNumber,
      templateVersion,
      resume.targetRole || '',
      resume.targetCompany || '',
      latexSource,
      resumeJson,
      pdfPath,
      generationStatus,
      errorLog,
      now,
      now
    );

    return {
      id,
      jobId,
      versionNumber: nextVersionNumber,
      templateVersion,
      targetRole: resume.targetRole || '',
      targetCompany: resume.targetCompany || '',
      latexSource,
      resumeJson,
      pdfPath,
      generationStatus,
      errorLog,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Updates the PDF path and compilation status of a resume version.
   */
  async updateResumePdf(
    id: string,
    pdfPath: string | null,
    generationStatus: ResumeGenerationStatus,
    errorLog: string | null = null
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE resume_versions SET
         pdf_path = ?,
         generation_status = ?,
         error_log = ?,
         updated_at = ?
       WHERE id = ?;`,
      pdfPath,
      generationStatus,
      errorLog,
      now,
      id
    );
  },

  /**
   * Retrieves all resume versions across all applications for the Dedicated Resume Library.
   * Sorted newest-generated first.
   */
  async getAllResumeVersions(): Promise<ResumeLibraryItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ResumeLibraryRow>(`
      SELECT
        rv.id,
        rv.job_id,
        rv.version_number,
        rv.template_version,
        rv.target_role,
        rv.target_company,
        rv.pdf_path,
        rv.generation_status,
        rv.created_at,
        rv.updated_at,
        j.status as job_status,
        j.company as job_company,
        j.role as job_role,
        (CASE WHEN j.approved_resume_version_id = rv.id THEN 1 ELSE 0 END) as is_approved
      FROM resume_versions rv
      LEFT JOIN jobs j ON rv.job_id = j.id
      ORDER BY rv.created_at DESC;
    `);
    return rows.map(mapRowToLibraryItem);
  },

  /**
   * Retrieves all resume versions for a specific job, ordered by newest first.
   */
  async getResumeVersions(jobId: string): Promise<ResumeVersion[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ResumeVersionRow>(
      'SELECT id, job_id, version_number, template_version, target_role, target_company, latex_source, resume_json, pdf_path, generation_status, error_log, created_at, updated_at FROM resume_versions WHERE job_id = ? ORDER BY version_number DESC;',
      jobId
    );
    return rows.map(mapRowToVersion);
  },

  /**
   * Retrieves the latest resume version for a job.
   */
  async getLatestResumeVersion(jobId: string): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ResumeVersionRow>(
      'SELECT id, job_id, version_number, template_version, target_role, target_company, latex_source, resume_json, pdf_path, generation_status, error_log, created_at, updated_at FROM resume_versions WHERE job_id = ? ORDER BY version_number DESC LIMIT 1;',
      jobId
    );
    return row ? mapRowToVersion(row) : null;
  },

  /**
   * Retrieves a resume version by ID along with joined job status.
   */
  async getResumeLibraryDetails(
    id: string
  ): Promise<(ResumeVersion & { jobStatus?: JobStatus | null; isApproved?: boolean }) | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ResumeVersionRow & { job_status?: string | null; is_approved?: number | null }>(`
      SELECT
        rv.id,
        rv.job_id,
        rv.version_number,
        rv.template_version,
        rv.target_role,
        rv.target_company,
        rv.latex_source,
        rv.resume_json,
        rv.pdf_path,
        rv.generation_status,
        rv.error_log,
        rv.created_at,
        rv.updated_at,
        j.status as job_status,
        (CASE WHEN j.approved_resume_version_id = rv.id THEN 1 ELSE 0 END) as is_approved
      FROM resume_versions rv
      LEFT JOIN jobs j ON rv.job_id = j.id
      WHERE rv.id = ?;
    `, id);

    if (!row) return null;

    return {
      ...mapRowToVersion(row),
      jobStatus: (row.job_status as JobStatus) || null,
      isApproved: !!row.is_approved,
    };
  },

  /**
   * Retrieves a resume version by ID.
   */
  async getResumeVersion(id: string): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ResumeVersionRow>(
      'SELECT id, job_id, version_number, template_version, target_role, target_company, latex_source, resume_json, pdf_path, generation_status, error_log, created_at, updated_at FROM resume_versions WHERE id = ?;',
      id
    );
    return row ? mapRowToVersion(row) : null;
  },

  /**
   * Deletes a resume version from SQLite and removes its local PDF file.
   */
  async deleteResumeVersion(id: string): Promise<void> {
    const db = await getDatabase();
    const current = await this.getResumeVersion(id);

    if (current && current.pdfPath) {
      try {
        const FileSystem = await import('expo-file-system/legacy');
        const fileInfo = await FileSystem.getInfoAsync(current.pdfPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(current.pdfPath, { idempotent: true });
        }
      } catch {
        // Non-blocking file deletion
      }
    }

    await db.runAsync('DELETE FROM resume_versions WHERE id = ?;', id);
  },
};
