import { PersonalDetails, SkillCategory } from './profile';

export type SkillPriority = 'required' | 'preferred' | 'general';

export interface CustomizedSkillItem {
  profileId: string;
  name: string;
  category: SkillCategory;
  priority: SkillPriority;
  displayOrder: number;
}

export interface CustomizedExperienceItem {
  profileId: string;
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
  technologies: string;
  matchedSkills: string[];
  relevanceScore: number;
  displayOrder: number;
}

export interface CustomizedProjectItem {
  profileId: string;
  projectName: string;
  projectTypeOrDomain: string;
  technologies: string;
  description: string;
  featuresOrWorkDone: string;
  myContribution: string;
  matchedSkills: string[];
  relevanceScore: number;
  displayOrder: number;
}

export interface CustomizedEducationItem {
  profileId: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
  displayOrder: number;
}

export interface CustomizedCertificationItem {
  profileId: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  credentialId?: string;
  credentialUrl?: string;
  displayOrder: number;
}

export interface CustomizedResume {
  jobId: string;
  targetRole: string;
  targetCompany: string;
  personalDetails: PersonalDetails;
  summary: string;
  skills: CustomizedSkillItem[];
  experience: CustomizedExperienceItem[];
  projects: CustomizedProjectItem[];
  education: CustomizedEducationItem[];
  certifications: CustomizedCertificationItem[];
  unmatchedJdSkills: string[];
  overallMatchScore: number;
  generatedAt: string;
}
