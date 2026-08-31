export interface EmailDraft {
  id: string;
  jobId: string;
  resumeVersionId?: string | null;
  recipient: string;
  subject: string;
  body: string;
  signature: string;
  resumeFilePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateEmailInput {
  role: string;
  company: string;
  matchedSkills: string[];
  topExperienceCompany?: string;
  topExperienceRole?: string;
  topProjectName?: string;
  topProjectDomain?: string;
  candidateName: string;
}
