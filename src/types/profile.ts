export type SkillCategory =
  | 'Programming Languages'
  | 'Frontend'
  | 'Backend'
  | 'Databases'
  | 'Cloud'
  | 'DevOps / Infrastructure'
  | 'Tools'
  | 'Other';

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Programming Languages',
  'Frontend',
  'Backend',
  'Databases',
  'Cloud',
  'DevOps / Infrastructure',
  'Tools',
  'Other',
];

export interface PersonalDetails {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
}

export interface ProfessionalInfo {
  professionalTitle: string;
  professionalSummary: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export interface Experience {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
  technologies: string;
}

export interface Project {
  id: string;
  projectName: string;
  description: string;
  projectTypeOrDomain: string;
  technologies: string;
  featuresOrWorkDone: string;
  myContribution: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Profile {
  personalDetails: PersonalDetails;
  professionalInfo: ProfessionalInfo;
  skills: Skill[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
}

export const INITIAL_PROFILE: Profile = {
  personalDetails: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    portfolio: '',
  },
  professionalInfo: {
    professionalTitle: '',
    professionalSummary: '',
  },
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
};
