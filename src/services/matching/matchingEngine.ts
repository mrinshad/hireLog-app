import { JobAnalysis } from '@/types/job';
import {
  MatchResult,
  MatchScoreLabel,
  RelevantExperienceMatch,
  RelevantProjectMatch,
  SkillMatchItem,
  SkillMatchType,
} from '@/types/matching';
import { Experience, Profile, Project, Skill } from '@/types/profile';

// Explicit canonical alias map for standard variations
const ALIAS_MAP: Record<string, string> = {
  react: 'react',
  reactjs: 'react',
  'react.js': 'react',
  'react native': 'react native',
  'react-native': 'react native',
  node: 'node.js',
  nodejs: 'node.js',
  'node.js': 'node.js',
  vue: 'vue',
  vuejs: 'vue',
  'vue.js': 'vue',
  angular: 'angular',
  angularjs: 'angular',
  'angular.js': 'angular',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  go: 'go',
  golang: 'go',
  k8s: 'kubernetes',
  kubernetes: 'kubernetes',
  gcp: 'gcp',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  aws: 'aws',
  'amazon web services': 'aws',
  azure: 'azure',
  'microsoft azure': 'azure',
  mongo: 'mongodb',
  mongodb: 'mongodb',
  graphql: 'graphql',
  'graph ql': 'graphql',
  rest: 'rest api',
  restful: 'rest api',
  'rest api': 'rest api',
  'rest apis': 'rest api',
  'restful apis': 'rest api',
  'restful api': 'rest api',
  'ci/cd': 'ci/cd',
  cicd: 'ci/cd',
  'ci cd': 'ci/cd',
  docker: 'docker',
  containerization: 'docker',
  ts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  javascript: 'javascript',
  dotnet: '.net',
  '.net': '.net',
  '.net core': '.net',
  'asp.net': '.net',
  csharp: 'c#',
  'c#': 'c#',
  cplusplus: 'c++',
  'c++': 'c++',
};

/**
 * Normalizes a skill string for comparison.
 */
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Resolves a skill to its canonical form using the explicit alias map.
 */
export function getCanonicalSkill(skill: string): string {
  const normalized = normalizeSkill(skill);
  return ALIAS_MAP[normalized] || normalized;
}

/**
 * Checks if a JD skill matches a candidate skill.
 */
export function matchSkill(
  jdSkill: string,
  candidateSkills: string[]
): { matched: boolean; matchType: SkillMatchType; profileSkill: string | null } {
  const normJd = normalizeSkill(jdSkill);
  const canonJd = getCanonicalSkill(jdSkill);

  // 1. Check exact match (case-insensitive)
  for (const candidate of candidateSkills) {
    if (normalizeSkill(candidate) === normJd) {
      return { matched: true, matchType: 'exact', profileSkill: candidate };
    }
  }

  // 2. Check canonical alias match
  for (const candidate of candidateSkills) {
    if (getCanonicalSkill(candidate) === canonJd) {
      return { matched: true, matchType: 'alias', profileSkill: candidate };
    }
  }

  return { matched: false, matchType: 'unmatched', profileSkill: null };
}

/**
 * Collects all skills and technologies mentioned in the user profile.
 */
export function getAllCandidateSkills(profile: Profile): string[] {
  const skillSet = new Set<string>();

  // Profile skills
  profile.skills.forEach((s) => {
    if (s.name.trim()) skillSet.add(s.name.trim());
  });

  // Technologies from work experiences
  profile.experience.forEach((exp) => {
    if (exp.technologies) {
      exp.technologies
        .split(/[,/•\n]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .forEach((t) => skillSet.add(t));
    }
  });

  // Technologies from projects
  profile.projects.forEach((proj) => {
    if (proj.technologies) {
      proj.technologies
        .split(/[,/•\n]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .forEach((t) => skillSet.add(t));
    }
  });

  return Array.from(skillSet);
}

/**
 * Scores the relevance of a work experience entry to the JD.
 */
export function scoreExperience(
  exp: Experience,
  allJdSkills: string[],
  jdAnalysis: JobAnalysis
): RelevantExperienceMatch | null {
  const matchedSkills: string[] = [];
  const matchedKeywords: string[] = [];
  const reasons: string[] = [];

  // Extract technologies list from experience
  const expTechs = exp.technologies
    ? exp.technologies
        .split(/[,/•\n]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  // 1. Tech matches
  allJdSkills.forEach((jdSkill) => {
    const match = matchSkill(jdSkill, expTechs);
    if (match.matched) {
      matchedSkills.push(jdSkill);
    }
  });

  // 2. Keyword matching in title and description
  const combinedText = `${exp.jobTitle} ${exp.description}`.toLowerCase();

  if (jdAnalysis.role && combinedText.includes(jdAnalysis.role.toLowerCase())) {
    matchedKeywords.push('Role Match');
    reasons.push(`Direct role match with ${jdAnalysis.role}`);
  }

  allJdSkills.forEach((skill) => {
    if (!matchedSkills.includes(skill) && combinedText.includes(normalizeSkill(skill))) {
      matchedKeywords.push(skill);
    }
  });

  if (matchedSkills.length === 0 && matchedKeywords.length === 0) {
    return null;
  }

  // Calculate score
  const techScore = Math.min(60, matchedSkills.length * 15);
  const keywordScore = Math.min(25, matchedKeywords.length * 8);
  const totalScore = Math.min(100, Math.round(techScore + keywordScore + (matchedSkills.length > 0 ? 15 : 0)));

  if (matchedSkills.length > 0) {
    reasons.push(`Used ${matchedSkills.join(', ')} at ${exp.company}`);
  }

  return {
    experienceId: exp.id,
    company: exp.company,
    jobTitle: exp.jobTitle,
    score: totalScore,
    matchedSkills,
    matchedKeywords,
    reasons,
  };
}

/**
 * Scores the relevance of a project to the JD.
 */
export function scoreProject(
  proj: Project,
  allJdSkills: string[],
  jdAnalysis: JobAnalysis
): RelevantProjectMatch | null {
  const matchedSkills: string[] = [];
  const matchedKeywords: string[] = [];
  const reasons: string[] = [];

  // Extract technologies list from project
  const projTechs = proj.technologies
    ? proj.technologies
        .split(/[,/•\n]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  // 1. Tech matches
  allJdSkills.forEach((jdSkill) => {
    const match = matchSkill(jdSkill, projTechs);
    if (match.matched) {
      matchedSkills.push(jdSkill);
    }
  });

  // 2. Domain / Keyword matches
  const combinedText = `${proj.projectName} ${proj.projectTypeOrDomain} ${proj.description} ${proj.featuresOrWorkDone} ${proj.myContribution}`.toLowerCase();

  if (
    proj.projectTypeOrDomain &&
    jdAnalysis.role &&
    (combinedText.includes('full-stack') ||
      combinedText.includes('mobile') ||
      combinedText.includes('frontend') ||
      combinedText.includes('backend'))
  ) {
    matchedKeywords.push(proj.projectTypeOrDomain);
    reasons.push(`Domain overlap in ${proj.projectTypeOrDomain}`);
  }

  allJdSkills.forEach((skill) => {
    if (!matchedSkills.includes(skill) && combinedText.includes(normalizeSkill(skill))) {
      matchedKeywords.push(skill);
    }
  });

  if (matchedSkills.length === 0 && matchedKeywords.length === 0) {
    return null;
  }

  // Calculate score
  const techScore = Math.min(55, matchedSkills.length * 15);
  const domainScore = proj.projectTypeOrDomain ? 20 : 0;
  const keywordScore = Math.min(25, matchedKeywords.length * 8);
  const totalScore = Math.min(100, Math.round(techScore + domainScore + keywordScore));

  if (matchedSkills.length > 0) {
    reasons.push(`Built using ${matchedSkills.join(', ')}`);
  }

  return {
    projectId: proj.id,
    projectName: proj.projectName,
    projectTypeOrDomain: proj.projectTypeOrDomain,
    score: totalScore,
    matchedSkills,
    matchedKeywords,
    reasons,
  };
}

/**
 * Returns a score label according to HireLog specifications.
 */
export function getScoreLabel(score: number): MatchScoreLabel {
  if (score <= 30) return 'Low match';
  if (score <= 50) return 'Partial match';
  if (score <= 70) return 'Good match';
  if (score <= 85) return 'Strong match';
  return 'Very strong match';
}

export const matchingEngine = {
  /**
   * Performs 100% deterministic matching between Profile and JobAnalysis.
   */
  match(profile: Profile, jdAnalysis: JobAnalysis): MatchResult {
    const candidateSkills = getAllCandidateSkills(profile);

    // 1. Match Required Skills
    const reqMatched: SkillMatchItem[] = [];
    const reqMissing: SkillMatchItem[] = [];

    (jdAnalysis.requiredSkills || []).forEach((jdSkill) => {
      const res = matchSkill(jdSkill, candidateSkills);
      const item: SkillMatchItem = {
        jdSkill,
        profileSkill: res.profileSkill,
        matchType: res.matchType,
        matched: res.matched,
      };

      if (res.matched) {
        reqMatched.push(item);
      } else {
        reqMissing.push(item);
      }
    });

    const reqTotal = reqMatched.length + reqMissing.length;
    const reqPercentage = reqTotal > 0 ? (reqMatched.length / reqTotal) * 100 : 100;

    // 2. Match Preferred Skills
    const prefMatched: SkillMatchItem[] = [];
    const prefMissing: SkillMatchItem[] = [];

    (jdAnalysis.preferredSkills || []).forEach((jdSkill) => {
      const res = matchSkill(jdSkill, candidateSkills);
      const item: SkillMatchItem = {
        jdSkill,
        profileSkill: res.profileSkill,
        matchType: res.matchType,
        matched: res.matched,
      };

      if (res.matched) {
        prefMatched.push(item);
      } else {
        prefMissing.push(item);
      }
    });

    const prefTotal = prefMatched.length + prefMissing.length;
    const prefPercentage = prefTotal > 0 ? (prefMatched.length / prefTotal) * 100 : 100;

    const allJdSkills = [
      ...(jdAnalysis.requiredSkills || []),
      ...(jdAnalysis.preferredSkills || []),
    ];

    // 3. Relevant Experiences
    const relevantExperiences: RelevantExperienceMatch[] = (profile.experience || [])
      .map((exp) => scoreExperience(exp, allJdSkills, jdAnalysis))
      .filter((m): m is RelevantExperienceMatch => m !== null)
      .sort((a, b) => b.score - a.score);

    // 4. Relevant Projects
    const relevantProjects: RelevantProjectMatch[] = (profile.projects || [])
      .map((proj) => scoreProject(proj, allJdSkills, jdAnalysis))
      .filter((p): p is RelevantProjectMatch => p !== null)
      .sort((a, b) => b.score - a.score);

    // 5. Calculate Overall Match Score
    const hasRequired = reqTotal > 0;
    const hasPreferred = prefTotal > 0;

    // Average score of top experiences/projects
    const topExpScore = relevantExperiences.length > 0 ? relevantExperiences[0].score : 0;
    const topProjScore = relevantProjects.length > 0 ? relevantProjects[0].score : 0;
    const expProjScore =
      topExpScore > 0 && topProjScore > 0
        ? (topExpScore + topProjScore) / 2
        : topExpScore || topProjScore || 0;

    let overallScore = 0;

    if (candidateSkills.length === 0 && profile.experience.length === 0 && profile.projects.length === 0) {
      // Empty profile
      overallScore = 0;
    } else if (!hasRequired && !hasPreferred) {
      // Generic JD with no explicit skills listed
      overallScore = expProjScore > 0 ? expProjScore : 50;
    } else if (hasRequired && hasPreferred) {
      overallScore =
        reqPercentage * 0.6 + prefPercentage * 0.2 + (expProjScore / 100) * 20;
    } else if (hasRequired && !hasPreferred) {
      overallScore =
        reqPercentage * 0.75 + (expProjScore / 100) * 25;
    } else {
      // Only preferred skills
      overallScore =
        prefPercentage * 0.6 + (expProjScore / 100) * 40;
    }

    const finalOverallScore = Math.min(100, Math.max(0, Math.round(overallScore)));

    const allMatchedSkills = [
      ...reqMatched.map((m) => m.jdSkill),
      ...prefMatched.map((m) => m.jdSkill),
    ];
    const allMissingSkills = [
      ...reqMissing.map((m) => m.jdSkill),
      ...prefMissing.map((m) => m.jdSkill),
    ];

    return {
      overallScore: finalOverallScore,
      scoreLabel: getScoreLabel(finalOverallScore),
      requiredSkills: {
        matched: reqMatched,
        missing: reqMissing,
        matchPercentage: Math.round(reqPercentage),
      },
      preferredSkills: {
        matched: prefMatched,
        missing: prefMissing,
        matchPercentage: Math.round(prefPercentage),
      },
      allMatchedSkills,
      allMissingSkills,
      relevantExperiences,
      relevantProjects,
      generatedAt: new Date().toISOString(),
    };
  },
};
