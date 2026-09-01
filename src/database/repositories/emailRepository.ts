import { getDatabase } from '../database';
import { errorLogger } from '@/services/logging/errorLogger';
import { EmailDraft } from '@/types/email';

interface EmailDraftRow {
  id: string;
  job_id: string;
  resume_version_id?: string | null;
  recipient: string;
  subject: string;
  body: string;
  signature: string;
  resume_file_path?: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToDraft(row: EmailDraftRow): EmailDraft {
  return {
    id: row.id,
    jobId: row.job_id,
    resumeVersionId: row.resume_version_id || null,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    signature: row.signature,
    resumeFilePath: row.resume_file_path || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const emailRepository = {
  /**
   * Retrieves an existing email draft for a specific job.
   */
  async getDraftByJobId(jobId: string): Promise<EmailDraft | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<EmailDraftRow>(
        'SELECT id, job_id, resume_version_id, recipient, subject, body, signature, resume_file_path, created_at, updated_at FROM email_drafts WHERE job_id = ?;',
        jobId
      );
      return row ? mapRowToDraft(row) : null;
    } catch (err: any) {
      await errorLogger.logError('emailRepository.getDraftByJobId', err, { jobId });
      return null;
    }
  },

  /**
   * Upserts an email draft for a specific job.
   */
  async saveDraft(
    draft: Omit<EmailDraft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<EmailDraft> {
    try {
      const db = await getDatabase();
      const id = draft.id || `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO email_drafts (id, job_id, resume_version_id, recipient, subject, body, signature, resume_file_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(job_id) DO UPDATE SET
           resume_version_id = excluded.resume_version_id,
           recipient = excluded.recipient,
           subject = excluded.subject,
           body = excluded.body,
           signature = excluded.signature,
           resume_file_path = excluded.resume_file_path,
           updated_at = excluded.updated_at;`,
        id,
        draft.jobId,
        draft.resumeVersionId || null,
        draft.recipient || '',
        draft.subject || '',
        draft.body || '',
        draft.signature || '',
        draft.resumeFilePath || null,
        now,
        now
      );

      const updated = await this.getDraftByJobId(draft.jobId);
      return updated!;
    } catch (err: any) {
      await errorLogger.logError('emailRepository.saveDraft', err, { jobId: draft.jobId });
      throw err;
    }
  },

  /**
   * Deletes an email draft for a job.
   */
  async deleteDraft(jobId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM email_drafts WHERE job_id = ?;', jobId);
    } catch (err: any) {
      await errorLogger.logError('emailRepository.deleteDraft', err, { jobId });
    }
  },
};
