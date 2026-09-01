import { getDatabase } from '../database';
import { errorLogger } from '@/services/logging/errorLogger';
import {
  AnalysisStatus,
  CreateJobInput,
  DashboardMetrics,
  Job,
  JobAnalysis,
  JobStatus,
  JobStatusHistory,
  UpdateJobInput,
  WorkflowState,
} from '@/types/job';
import { MatchResult } from '@/types/matching';

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
  applied_at?: string | null;
  analysis_status?: string;
  analysis_json?: string | null;
  analysis_updated_at?: string | null;
  workflow_state?: string;
  workflow_failed_step?: string | null;
  workflow_error_message?: string | null;
  approved_resume_version_id?: string | null;
  resume_approved_at?: string | null;
  match_json?: string | null;
  created_at: string;
  updated_at: string;
}

interface StatusHistoryRow {
  id: string;
  job_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
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

  let parsedMatch: MatchResult | null = null;
  if (row.match_json) {
    try {
      parsedMatch = JSON.parse(row.match_json) as MatchResult;
    } catch {
      parsedMatch = null;
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
    appliedAt: row.applied_at || null,
    analysisStatus: (row.analysis_status as AnalysisStatus) || 'Not analyzed',
    analysis: parsedAnalysis,
    workflowState: (row.workflow_state as WorkflowState) || 'CREATED',
    workflowFailedStep: row.workflow_failed_step || null,
    workflowErrorMessage: row.workflow_error_message || null,
    approvedResumeVersionId: row.approved_resume_version_id || null,
    resumeApprovedAt: row.resume_approved_at || null,
    matchResult: parsedMatch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToHistory(row: StatusHistoryRow): JobStatusHistory {
  return {
    id: row.id,
    jobId: row.job_id,
    oldStatus: row.old_status as JobStatus,
    newStatus: row.new_status as JobStatus,
    changedAt: row.changed_at,
  };
}

const SELECT_JOB_FIELDS = `
  id, company, role, location, job_description, application_email, salary, source, source_url,
  status, applied_at, analysis_status, analysis_json, analysis_updated_at,
  workflow_state, workflow_failed_step, workflow_error_message,
  approved_resume_version_id, resume_approved_at, match_json,
  created_at, updated_at
`;

export const jobRepository = {
  /**
   * Retrieves all jobs ordered by newest activity (updated_at) first.
   */
  async getJobs(): Promise<Job[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<JobRow>(
        `SELECT ${SELECT_JOB_FIELDS} FROM jobs ORDER BY updated_at DESC;`
      );
      return rows.map(mapRowToJob);
    } catch (err: any) {
      await errorLogger.logError('jobRepository.getJobs', err);
      throw err;
    }
  },

  /**
   * Retrieves jobs filtered by status and/or search query.
   */
  async getFilteredJobs(filter: { status?: string; search?: string }): Promise<Job[]> {
    try {
      const db = await getDatabase();
      let query = `SELECT ${SELECT_JOB_FIELDS} FROM jobs WHERE 1=1`;
      const params: string[] = [];

      if (filter.status && filter.status !== 'All') {
        query += ' AND status = ?';
        params.push(filter.status);
      }

      if (filter.search && filter.search.trim()) {
        query += ' AND (company LIKE ? OR role LIKE ? OR location LIKE ?)';
        const term = `%${filter.search.trim()}%`;
        params.push(term, term, term);
      }

      query += ' ORDER BY updated_at DESC;';

      const rows = await db.getAllAsync<JobRow>(query, ...params);
      return rows.map(mapRowToJob);
    } catch (err: any) {
      await errorLogger.logError('jobRepository.getFilteredJobs', err, filter);
      throw err;
    }
  },

  /**
   * Retrieves the most recent jobs ordered by activity.
   */
  async getRecentJobs(limit = 5): Promise<Job[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<JobRow>(
        `SELECT ${SELECT_JOB_FIELDS} FROM jobs ORDER BY updated_at DESC LIMIT ?;`,
        limit
      );
      return rows.map(mapRowToJob);
    } catch (err: any) {
      await errorLogger.logError('jobRepository.getRecentJobs', err, { limit });
      throw err;
    }
  },

  /**
   * Retrieves a single job by id.
   */
  async getJob(id: string): Promise<Job | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<JobRow>(
        `SELECT ${SELECT_JOB_FIELDS} FROM jobs WHERE id = ?;`,
        id
      );
      return row ? mapRowToJob(row) : null;
    } catch (err: any) {
      await errorLogger.logError('jobRepository.getJob', err, { id });
      throw err;
    }
  },

  /**
   * Creates a new job posting in SQLite.
   */
  async createJob(input: CreateJobInput): Promise<Job> {
    try {
      const db = await getDatabase();
      const id = input.id || Date.now().toString();
      const status = input.status || 'Draft';
      const appliedAt = status === 'Applied' ? new Date().toISOString() : null;
      const analysisStatus = input.analysisStatus || 'Not analyzed';
      const analysisJson = input.analysis ? JSON.stringify(input.analysis) : null;
      const workflowState = input.workflowState || 'CREATED';
      const matchJson = input.matchResult ? JSON.stringify(input.matchResult) : null;
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO jobs (
           id, company, role, location, job_description, application_email, salary, source, source_url,
           status, applied_at, analysis_status, analysis_json, analysis_updated_at,
           workflow_state, workflow_failed_step, workflow_error_message,
           approved_resume_version_id, resume_approved_at, match_json,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
        appliedAt,
        analysisStatus,
        analysisJson,
        input.analysis ? now : null,
        workflowState,
        input.workflowFailedStep || null,
        input.workflowErrorMessage || null,
        input.approvedResumeVersionId || null,
        input.resumeApprovedAt || null,
        matchJson,
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
        appliedAt,
        analysisStatus,
        analysis: input.analysis,
        workflowState,
        workflowFailedStep: input.workflowFailedStep || null,
        workflowErrorMessage: input.workflowErrorMessage || null,
        approvedResumeVersionId: input.approvedResumeVersionId || null,
        resumeApprovedAt: input.resumeApprovedAt || null,
        matchResult: input.matchResult || null,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err: any) {
      await errorLogger.logError('jobRepository.createJob', err, {
        company: input.company,
        role: input.role,
      });
      throw err;
    }
  },

  /**
   * Updates an existing job posting in SQLite.
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
    let appliedAt = updates.appliedAt !== undefined ? updates.appliedAt : current.appliedAt;

    if (updates.status === 'Applied' && !appliedAt) {
      appliedAt = new Date().toISOString();
    }

    let analysisStatus =
      updates.analysisStatus !== undefined ? updates.analysisStatus : current.analysisStatus;
    if (
      updates.jobDescription !== undefined &&
      updates.jobDescription !== current.jobDescription &&
      current.analysisStatus === 'Analyzed'
    ) {
      analysisStatus = 'Outdated';
    }

    const workflowState =
      updates.workflowState !== undefined ? updates.workflowState : current.workflowState;
    const workflowFailedStep =
      updates.workflowFailedStep !== undefined ? updates.workflowFailedStep : current.workflowFailedStep;
    const workflowErrorMessage =
      updates.workflowErrorMessage !== undefined ? updates.workflowErrorMessage : current.workflowErrorMessage;
    const approvedResumeVersionId =
      updates.approvedResumeVersionId !== undefined ? updates.approvedResumeVersionId : current.approvedResumeVersionId;
    const resumeApprovedAt =
      updates.resumeApprovedAt !== undefined ? updates.resumeApprovedAt : current.resumeApprovedAt;
    const matchJson =
      updates.matchResult !== undefined
        ? updates.matchResult
          ? JSON.stringify(updates.matchResult)
          : null
        : current.matchResult
        ? JSON.stringify(current.matchResult)
        : null;

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
         applied_at = ?,
         analysis_status = ?,
         workflow_state = ?,
         workflow_failed_step = ?,
         workflow_error_message = ?,
         approved_resume_version_id = ?,
         resume_approved_at = ?,
         match_json = ?,
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
      appliedAt || null,
      analysisStatus,
      workflowState,
      workflowFailedStep || null,
      workflowErrorMessage || null,
      approvedResumeVersionId || null,
      resumeApprovedAt || null,
      matchJson,
      now,
      id
    );
  },

  /**
   * Updates workflow state and optional error tracking.
   */
  async updateWorkflowState(
    id: string,
    workflowState: WorkflowState,
    failedStep: string | null = null,
    errorMessage: string | null = null
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE jobs SET
         workflow_state = ?,
         workflow_failed_step = ?,
         workflow_error_message = ?,
         updated_at = ?
       WHERE id = ?;`,
      workflowState,
      failedStep,
      errorMessage,
      now,
      id
    );
  },

  /**
   * Records approval of a resume version for this job.
   */
  async setApprovedResumeVersion(id: string, resumeVersionId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE jobs SET
         approved_resume_version_id = ?,
         resume_approved_at = ?,
         workflow_state = 'GENERATING_EMAIL',
         updated_at = ?
       WHERE id = ?;`,
      resumeVersionId,
      now,
      now,
      id
    );
  },

  /**
   * Persists calculated profile match results for this job.
   */
  async updateJobMatch(id: string, matchResult: MatchResult): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE jobs SET
         match_json = ?,
         updated_at = ?
       WHERE id = ?;`,
      JSON.stringify(matchResult),
      now,
      id
    );
  },

  /**
   * Updates job status and logs transition in job_status_history.
   */
  async updateJobStatus(id: string, newStatus: JobStatus): Promise<Job> {
    const db = await getDatabase();
    const current = await this.getJob(id);
    if (!current) {
      throw new Error(`Job with id ${id} not found.`);
    }

    if (current.status === newStatus) {
      return current;
    }

    const now = new Date().toISOString();
    const historyId = `sh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.runAsync(
      'INSERT INTO job_status_history (id, job_id, old_status, new_status, changed_at) VALUES (?, ?, ?, ?, ?);',
      historyId,
      id,
      current.status,
      newStatus,
      now
    );

    let appliedAt = current.appliedAt;
    if (newStatus === 'Applied' && !appliedAt) {
      appliedAt = now;
    }

    const workflowState = newStatus === 'Applied' ? 'APPLIED' : current.workflowState;

    await db.runAsync(
      'UPDATE jobs SET status = ?, applied_at = ?, workflow_state = ?, updated_at = ? WHERE id = ?;',
      newStatus,
      appliedAt || null,
      workflowState,
      now,
      id
    );

    const updated = await this.getJob(id);
    return updated!;
  },

  /**
   * Retrieves the status transition history for a job.
   */
  async getStatusHistory(jobId: string): Promise<JobStatusHistory[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<StatusHistoryRow>(
      'SELECT id, job_id, old_status, new_status, changed_at FROM job_status_history WHERE job_id = ? ORDER BY changed_at DESC;',
      jobId
    );
    return rows.map(mapRowToHistory);
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
   * Deletes a job posting and its associated application data from SQLite and cleans up local resume files.
   */
  async deleteJob(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM jobs WHERE id = ?;', id);

    try {
      const FileSystem = await import('expo-file-system/legacy');
      if (FileSystem?.documentDirectory) {
        const jobResumeDir = `${FileSystem.documentDirectory}resumes/${id}/`;
        const dirInfo = await FileSystem.getInfoAsync(jobResumeDir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(jobResumeDir, { idempotent: true });
        }
      }
    } catch {
      // Non-blocking file cleanup
    }
  },

  /**
   * Calculates dashboard summary metrics across all applications.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const db = await getDatabase();

    const countsRow = await db.getFirstAsync<{
      total: number;
      draft: number;
      ready: number;
      applied: number;
      interview: number;
      offer: number;
      rejected: number;
      withdrawn: number;
    }>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'Ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'Interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'Offer' THEN 1 ELSE 0 END) as offer,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'Withdrawn' THEN 1 ELSE 0 END) as withdrawn
      FROM jobs;
    `);

    return {
      total: countsRow?.total || 0,
      draft: countsRow?.draft || 0,
      ready: countsRow?.ready || 0,
      applied: countsRow?.applied || 0,
      interview: countsRow?.interview || 0,
      offer: countsRow?.offer || 0,
      rejected: countsRow?.rejected || 0,
      withdrawn: countsRow?.withdrawn || 0,
    };
  },
};
