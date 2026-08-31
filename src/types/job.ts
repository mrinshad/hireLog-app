export type JobStatus =
  | 'Draft'
  | 'Ready'
  | 'Applied'
  | 'Interview'
  | 'Rejected'
  | 'Offer'
  | 'Withdrawn';

export const JOB_STATUSES: JobStatus[] = [
  'Draft',
  'Ready',
  'Applied',
  'Interview',
  'Rejected',
  'Offer',
  'Withdrawn',
];

export interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  jobDescription: string;
  applicationEmail?: string;
  salary?: string;
  source?: string;
  sourceUrl?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export type CreateJobInput = Omit<Job, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type UpdateJobInput = Partial<Omit<Job, 'id' | 'createdAt'>>;
