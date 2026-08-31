import { Job } from '@/types/job';
import { Profile } from '@/types/profile';

export interface RecipientResolution {
  recipient: string;
  source: 'job_manual' | 'jd_extracted' | 'none';
}

/**
 * Resolves recipient in priority order:
 * 1. Email manually provided on Job record
 * 2. Email extracted from JD analysis
 * 3. Empty (none)
 */
export function resolveRecipient(job: Job): RecipientResolution {
  if (job.applicationEmail && job.applicationEmail.trim()) {
    return {
      recipient: job.applicationEmail.trim(),
      source: 'job_manual',
    };
  }

  if (job.analysis?.applicationEmail && job.analysis.applicationEmail.trim()) {
    return {
      recipient: job.analysis.applicationEmail.trim(),
      source: 'jd_extracted',
    };
  }

  return {
    recipient: '',
    source: 'none',
  };
}

/**
 * Generates a clean, standard job application subject line.
 */
export function formatDefaultSubject(role: string, candidateName?: string): string {
  const rolePart = role ? role.trim() : 'Software Engineer';
  const namePart = candidateName ? ` - ${candidateName.trim()}` : '';
  return `Application for ${rolePart}${namePart}`;
}

/**
 * Deterministically composes a candidate signature from Profile contact details.
 */
export function formatSignature(profile: Profile): string {
  const p = profile.personalDetails;
  const lines: string[] = ['Best regards,'];

  if (p.fullName) lines.push(p.fullName);

  const contactParts: string[] = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);

  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '));
  }

  if (p.linkedIn) lines.push(p.linkedIn);
  if (p.portfolio) lines.push(p.portfolio);

  return lines.join('\n');
}
