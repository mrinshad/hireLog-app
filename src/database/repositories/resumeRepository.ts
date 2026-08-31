import { getDatabase } from '../database';
import { ResumeVersion } from '@/services/latex/types';
import { CustomizedResume } from '@/types/resume';

interface ResumeVersionRow {
  id: string;
  job_id: string;
  version_number: number;
  target_role: string;
  target_company: string;
  latex_source: string;
  resume_json: string;
  created_at: string;
  updated_at: string;
}

function mapRowToVersion(row: ResumeVersionRow): ResumeVersion {
  return {
    id: row.id,
    jobId: row.job_id,
    versionNumber: row.version_number,
    targetRole: row.target_role,
    targetCompany: row.target_company,
    latexSource: row.latex_source,
    resumeJson: row.resume_json,
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
    latexSource: string
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
      `INSERT INTO resume_versions (id, job_id, version_number, target_role, target_company, latex_source, resume_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      jobId,
      nextVersionNumber,
      resume.targetRole || '',
      resume.targetCompany || '',
      latexSource,
      resumeJson,
      now,
      now
    );

    return {
      id,
      jobId,
      versionNumber: nextVersionNumber,
      targetRole: resume.targetRole || '',
      targetCompany: resume.targetCompany || '',
      latexSource,
      resumeJson,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Retrieves all resume versions for a specific job, ordered by newest first.
   */
  async getResumeVersions(jobId: string): Promise<ResumeVersion[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ResumeVersionRow>(
      'SELECT id, job_id, version_number, target_role, target_company, latex_source, resume_json, created_at, updated_at FROM resume_versions WHERE job_id = ? ORDER BY version_number DESC;',
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
      'SELECT id, job_id, version_number, target_role, target_company, latex_source, resume_json, created_at, updated_at FROM resume_versions WHERE job_id = ? ORDER BY version_number DESC LIMIT 1;',
      jobId
    );
    return row ? mapRowToVersion(row) : null;
  },

  /**
   * Retrieves a resume version by ID.
   */
  async getResumeVersion(id: string): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ResumeVersionRow>(
      'SELECT id, job_id, version_number, target_role, target_company, latex_source, resume_json, created_at, updated_at FROM resume_versions WHERE id = ?;',
      id
    );
    return row ? mapRowToVersion(row) : null;
  },

  /**
   * Deletes a resume version from SQLite.
   */
  async deleteResumeVersion(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM resume_versions WHERE id = ?;', id);
  },
};
