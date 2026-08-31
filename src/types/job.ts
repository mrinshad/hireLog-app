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
  analysisStatus: AnalysisStatus;
  analysis?: JobAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateJobInput = Omit<
  Job,
  'id' | 'createdAt' | 'updatedAt' | 'analysisStatus' | 'analysis'
> & {
  id?: string;
  status?: JobStatus;
  analysisStatus?: AnalysisStatus;
  analysis?: JobAnalysis | null;
};

export type UpdateJobInput = Partial<Omit<Job, 'id' | 'createdAt'>>;
