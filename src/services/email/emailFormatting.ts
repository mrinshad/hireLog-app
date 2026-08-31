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
export function resolveRecipient(job?: Partial<Job> | null): RecipientResolution {
  if (!job) {
    return { recipient: '', source: 'none' };
  }

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
export function formatDefaultSubject(role?: string, candidateName?: string): string {
  const rolePart = role && role.trim() ? role.trim() : 'Software Engineer';
  const namePart = candidateName && candidateName.trim() ? ` - ${candidateName.trim()}` : '';
  return `Application for ${rolePart}${namePart}`;
}

export const formatSubjectLine = formatDefaultSubject;

/**
 * Deterministically composes a candidate signature from Profile contact details.
 */
export function formatSignature(profile?: Profile | null): string {
  if (!profile || !profile.personalDetails) {
    return 'Best regards,';
  }

  const p = profile.personalDetails;
  const lines: string[] = ['Best regards,'];

  if (p.fullName && p.fullName.trim()) {
    lines.push(p.fullName.trim());
  }

  const contactParts: string[] = [];
  if (p.email && p.email.trim()) contactParts.push(p.email.trim());
  if (p.phone && p.phone.trim()) contactParts.push(p.phone.trim());

  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '));
  }

  if (p.linkedIn && p.linkedIn.trim()) lines.push(p.linkedIn.trim());
  if (p.portfolio && p.portfolio.trim()) lines.push(p.portfolio.trim());

  return lines.join('\n');
}

export const formatCandidateSignature = formatSignature;
