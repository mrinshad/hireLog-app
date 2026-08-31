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

export type AnalysisStatus =
  | 'Not analyzed'
  | 'Analyzing'
  | 'Analyzed'
  | 'Failed'
  | 'Outdated';

export interface JobAnalysis {
  company: string | null;
  role: string | null;
  location: string | null;
  experienceRequirement: string | null;
  educationRequirement: string | null;
  salary: string | null;
  employmentType: string | null;
  workMode: string | null;
  applicationEmail: string | null;
  applicationUrl: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  otherRequirements: string[];
  analyzedAt: string;
}

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
  appliedAt?: string | null;
  analysisStatus: AnalysisStatus;
  analysis?: JobAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatusHistory {
  id: string;
  jobId: string;
  oldStatus: JobStatus;
  newStatus: JobStatus;
  changedAt: string;
}

export interface DashboardMetrics {
  total: number;
  draft: number;
  ready: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  withdrawn: number;
}

export type CreateJobInput = Omit<
  Job,
  'id' | 'createdAt' | 'updatedAt' | 'analysisStatus' | 'analysis' | 'appliedAt'
> & {
  id?: string;
  status?: JobStatus;
  appliedAt?: string | null;
  analysisStatus?: AnalysisStatus;
  analysis?: JobAnalysis | null;
};

export type UpdateJobInput = Partial<Omit<Job, 'id' | 'createdAt'>>;
