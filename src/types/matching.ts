export type SkillMatchType = 'exact' | 'alias' | 'unmatched';

export type MatchScoreLabel =
  | 'Low match'
  | 'Partial match'
  | 'Good match'
  | 'Strong match'
  | 'Very strong match';

export interface SkillMatchItem {
  jdSkill: string;
  profileSkill: string | null;
  matchType: SkillMatchType;
  matched: boolean;
}

export interface RelevantExperienceMatch {
  experienceId: string;
  company: string;
  jobTitle: string;
  score: number; // 0 - 100
  matchedSkills: string[];
  matchedKeywords: string[];
  reasons: string[];
}

export interface RelevantProjectMatch {
  projectId: string;
  projectName: string;
  projectTypeOrDomain: string;
  score: number; // 0 - 100
  matchedSkills: string[];
  matchedKeywords: string[];
  reasons: string[];
}

export interface MatchResult {
  overallScore: number; // 0 - 100
  scoreLabel: MatchScoreLabel;
  requiredSkills: {
    matched: SkillMatchItem[];
    missing: SkillMatchItem[];
    matchPercentage: number;
  };
  preferredSkills: {
    matched: SkillMatchItem[];
    missing: SkillMatchItem[];
    matchPercentage: number;
  };
  allMatchedSkills: string[];
  allMissingSkills: string[];
  relevantExperiences: RelevantExperienceMatch[];
  relevantProjects: RelevantProjectMatch[];
  generatedAt: string;
}
