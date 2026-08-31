import { JobStatus } from '@/types/job';
import { Colors } from '@/constants/theme';

export type FeatherIconName =
  | 'edit-2'
  | 'check'
  | 'send'
  | 'calendar'
  | 'award'
  | 'x-circle'
  | 'slash'
  | 'file-text'
  | 'briefcase'
  | 'user'
  | 'settings'
  | 'trash-2'
  | 'plus'
  | 'search'
  | 'arrow-left'
  | 'chevron-right'
  | 'share-2'
  | 'eye'
  | 'copy'
  | 'mail';

export interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
  featherIcon: FeatherIconName;
  icon: string;
}

export const STATUS_CONFIG: Record<JobStatus, StatusStyle> = {
  Draft: {
    bg: Colors.neutralBg,
    text: Colors.neutralText,
    border: Colors.neutralBorder,
    label: 'Draft',
    featherIcon: 'edit-2',
    icon: 'edit-2',
  },
  Ready: {
    bg: Colors.warningBg,
    text: Colors.warningText,
    border: Colors.warningBorder,
    label: 'Ready',
    featherIcon: 'check',
    icon: 'check',
  },
  Applied: {
    bg: Colors.primaryLight,
    text: Colors.primaryDark,
    border: Colors.primaryBorder,
    label: 'Applied',
    featherIcon: 'send',
    icon: 'send',
  },
  Interview: {
    bg: Colors.infoBg,
    text: Colors.infoText,
    border: Colors.infoBorder,
    label: 'Interview',
    featherIcon: 'calendar',
    icon: 'calendar',
  },
  Offer: {
    bg: Colors.successBg,
    text: Colors.successText,
    border: Colors.successBorder,
    label: 'Offer',
    featherIcon: 'award',
    icon: 'award',
  },
  Rejected: {
    bg: Colors.errorBg,
    text: Colors.errorText,
    border: Colors.errorBorder,
    label: 'Rejected',
    featherIcon: 'x-circle',
    icon: 'x-circle',
  },
  Withdrawn: {
    bg: Colors.slateBg,
    text: Colors.slateText,
    border: Colors.slateBorder,
    label: 'Withdrawn',
    featherIcon: 'slash',
    icon: 'slash',
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
