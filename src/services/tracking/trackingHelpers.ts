import { JobStatus } from '@/types/job';

export interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: string;
}

export const STATUS_CONFIG: Record<JobStatus, StatusStyle> = {
  Draft: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#CBD5E1',
    label: 'Draft',
    icon: '📝',
  },
  Ready: {
    bg: '#EFF6FF',
    text: '#2563EB',
    border: '#BFDBFE',
    label: 'Ready',
    icon: '✨',
  },
  Applied: {
    bg: '#F0F9FF',
    text: '#0284C7',
    border: '#BAE6FD',
    label: 'Applied',
    icon: '🚀',
  },
  Interview: {
    bg: '#F5F3FF',
    text: '#7C3AED',
    border: '#DDD6FE',
    label: 'Interview',
    icon: '🎯',
  },
  Offer: {
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
    label: 'Offer',
    icon: '🎉',
  },
  Rejected: {
    bg: '#FFF1F2',
    text: '#E11D48',
    border: '#FECDD3',
    label: 'Rejected',
    icon: '✕',
  },
  Withdrawn: {
    bg: '#F8FAFC',
    text: '#64748B',
    border: '#E2E8F0',
    label: 'Withdrawn',
    icon: '⏹',
  },
};

/**
 * Formats ISO date string into a user-friendly relative or calendar date.
 */
export function formatRelativeDate(isoDateString?: string | null): string {
  if (!isoDateString) return 'Not set';

  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const targetTime = date.getTime();

  if (targetTime >= startOfToday) {
    return 'Today';
  } else if (targetTime >= startOfYesterday) {
    return 'Yesterday';
  }

  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();

  if (currentYear === dateYear) {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
