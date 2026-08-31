import { CustomizedResume } from '@/types/resume';

export type ResumeSectionId =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications';

export interface TemplateConfig {
  sectionOrder: ResumeSectionId[];
  showSummary: boolean;
  showSkills: boolean;
  showExperience: boolean;
  showProjects: boolean;
  showEducation: boolean;
  showCertifications: boolean;
  fontSize: '10pt' | '10.5pt' | '11pt';
  marginSize: '0.4in' | '0.5in' | '0.6in' | '0.75in';
  maxExperience?: number;
  maxProjects?: number;
  includeLocationInHeader?: boolean;
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  sectionOrder: [
    'summary',
    'skills',
    'experience',
    'projects',
    'education',
    'certifications',
  ],
  showSummary: true,
  showSkills: true,
  showExperience: true,
  showProjects: true,
  showEducation: true,
  showCertifications: true,
  fontSize: '10.5pt',
  marginSize: '0.5in',
  maxExperience: 5,
  maxProjects: 4,
  includeLocationInHeader: true,
};

export interface ResumeVersion {
  id: string;
  jobId: string;
  versionNumber: number;
  targetRole: string;
  targetCompany: string;
  latexSource: string;
  resumeJson: string;
  createdAt: string;
  updatedAt: string;
}
