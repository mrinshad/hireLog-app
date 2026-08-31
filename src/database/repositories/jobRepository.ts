import { getDatabase } from '../database';
import { AnalysisStatus, CreateJobInput, Job, JobAnalysis, JobStatus, UpdateJobInput } from '@/types/job';

interface JobRow {
  id: string;
  company: string;
  role: string;
  location: string;
  job_description: string;
  application_email: string;
  salary: string;
  source: string;
  source_url: string;
  status: string;
  analysis_status?: string;
  analysis_json?: string | null;
  analysis_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToJob(row: JobRow): Job {
  let parsedAnalysis: JobAnalysis | null = null;
  if (row.analysis_json) {
    try {
      parsedAnalysis = JSON.parse(row.analysis_json) as JobAnalysis;
    } catch {
      parsedAnalysis = null;
    }
  }

  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    jobDescription: row.job_description,
    applicationEmail: row.application_email || undefined,
    salary: row.salary || undefined,
    source: row.source || undefined,
    sourceUrl: row.source_url || undefined,
    status: row.status as JobStatus,
    analysisStatus: (row.analysis_status as AnalysisStatus) || 'Not analyzed',
    analysis: parsedAnalysis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const jobRepository = {
  /**
   * Retrieves all jobs ordered by newest first.
   */
  async getJobs(): Promise<Job[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<JobRow>(
      'SELECT id, company, role, location, job_description, application_email, salary, source, source_url, status, analysis_status, analysis_json, analysis_updated_at, created_at, updated_at FROM jobs ORDER BY created_at DESC;'
    );
    return rows.map(mapRowToJob);
  },

  /**
   * Retrieves the most recent jobs (for Home screen summary).
   */
  async getRecentJobs(limit = 3): Promise<Job[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<JobRow>(
      'SELECT id, company, role, location, job_description, application_email, salary, source, source_url, status, analysis_status, analysis_json, analysis_updated_at, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT ?;',
      limit
    );
    return rows.map(mapRowToJob);
  },

  /**
   * Retrieves a single job by id.
   */
  async getJob(id: string): Promise<Job | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<JobRow>(
      'SELECT id, company, role, location, job_description, application_email, salary, source, source_url, status, analysis_status, analysis_json, analysis_updated_at, created_at, updated_at FROM jobs WHERE id = ?;',
      id
    );
    return row ? mapRowToJob(row) : null;
  },

  /**
   * Creates a new job posting in SQLite.
   */
  async createJob(input: CreateJobInput): Promise<Job> {
    const db = await getDatabase();
    const id = input.id || Date.now().toString();
    const status = input.status || 'Draft';
    const analysisStatus = input.analysisStatus || 'Not analyzed';
    const analysisJson = input.analysis ? JSON.stringify(input.analysis) : null;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO jobs (id, company, role, location, job_description, application_email, salary, source, source_url, status, analysis_status, analysis_json, analysis_updated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      input.company || '',
      input.role || '',
      input.location || '',
      input.jobDescription,
      input.applicationEmail || '',
      input.salary || '',
      input.source || '',
      input.sourceUrl || '',
      status,
      analysisStatus,
      analysisJson,
      input.analysis ? now : null,
      now,
      now
    );

    return {
      id,
      company: input.company || '',
      role: input.role || '',
      location: input.location || '',
      jobDescription: input.jobDescription,
      applicationEmail: input.applicationEmail,
      salary: input.salary,
      source: input.source,
      sourceUrl: input.sourceUrl,
      status,
      analysisStatus,
      analysis: input.analysis,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Updates an existing job posting in SQLite.
   * If the raw jobDescription is updated, marks previous analysis as 'Outdated'.
   */
  async updateJob(id: string, updates: UpdateJobInput): Promise<void> {
    const db = await getDatabase();
    const current = await this.getJob(id);
    if (!current) {
      throw new Error(`Job with id ${id} not found.`);
    }

    const company = updates.company !== undefined ? updates.company : current.company;
    const role = updates.role !== undefined ? updates.role : current.role;
    const location = updates.location !== undefined ? updates.location : current.location;
    const jobDescription =
      updates.jobDescription !== undefined ? updates.jobDescription : current.jobDescription;
    const applicationEmail =
      updates.applicationEmail !== undefined ? updates.applicationEmail : current.applicationEmail || '';
    const salary = updates.salary !== undefined ? updates.salary : current.salary || '';
    const source = updates.source !== undefined ? updates.source : current.source || '';
    const sourceUrl = updates.sourceUrl !== undefined ? updates.sourceUrl : current.sourceUrl || '';
    const status = updates.status !== undefined ? updates.status : current.status;

    // Check if jobDescription was changed
    let analysisStatus =
      updates.analysisStatus !== undefined ? updates.analysisStatus : current.analysisStatus;
    if (
      updates.jobDescription !== undefined &&
      updates.jobDescription !== current.jobDescription &&
      current.analysisStatus === 'Analyzed'
    ) {
      analysisStatus = 'Outdated';
    }

    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE jobs SET
         company = ?,
         role = ?,
         location = ?,
         job_description = ?,
         application_email = ?,
         salary = ?,
         source = ?,
         source_url = ?,
         status = ?,
         analysis_status = ?,
         updated_at = ?
       WHERE id = ?;`,
      company,
      role,
      location,
      jobDescription,
      applicationEmail,
      salary,
      source,
      sourceUrl,
      status,
      analysisStatus,
      now,
      id
    );
  },

  /**
   * Updates the analysis result and status for a job in SQLite.
   */
  async updateJobAnalysis(
    id: string,
    status: AnalysisStatus,
    analysis?: JobAnalysis | null
  ): Promise<void> {
    const db = await getDatabase();
    const analysisJson = analysis ? JSON.stringify(analysis) : null;
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE jobs SET
         analysis_status = ?,
         analysis_json = ?,
         analysis_updated_at = ?,
         updated_at = ?
       WHERE id = ?;`,
      status,
      analysisJson,
      analysis ? now : null,
      now,
      id
    );
  },

  /**
   * Deletes a job posting from SQLite.
   */
  async deleteJob(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM jobs WHERE id = ?;', id);
  },

  /**
   * Summary counts for dashboard metrics.
   */
  async getMetrics(): Promise<{ total: number; draft: number; applied: number; interview: number }> {
    const db = await getDatabase();
    const totalRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM jobs;');
    const draftRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM jobs WHERE status = 'Draft';"
    );
    const appliedRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM jobs WHERE status = 'Applied';"
    );
    const interviewRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM jobs WHERE status = 'Interview';"
    );

    return {
      total: totalRow?.count || 0,
      draft: draftRow?.count || 0,
      applied: appliedRow?.count || 0,
      interview: interviewRow?.count || 0,
    };
  },
};
