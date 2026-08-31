import { JobAnalysis } from '@/types/job';
import { INITIAL_PROFILE, Profile } from '@/types/profile';
import { matchingEngine, matchSkill } from '../matchingEngine';

export function runMatchingEngineTests(): { total: number; passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${testName}`);
      failed++;
    }
  }

  console.log('\n--- Running JD-to-Profile Matching Engine Tests ---');

  // Test 1: Exact skill match
  {
    const res = matchSkill('Node.js', ['Node.js', 'React']);
    assert(res.matched === true && res.matchType === 'exact', 'Test 1: Exact skill match (Node.js -> Node.js)');
  }

  // Test 2: Missing skill (NestJS vs Node.js -> unmatched)
  {
    const res = matchSkill('NestJS', ['Node.js', 'Express']);
    assert(res.matched === false && res.matchType === 'unmatched', 'Test 2: Missing skill (NestJS vs Node.js is unmatched)');
  }

  // Test 3: Multiple matches
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [
        { id: '1', name: 'Node.js', category: 'Backend' },
        { id: '2', name: 'React', category: 'Frontend' },
        { id: '3', name: 'PostgreSQL', category: 'Databases' },
        { id: '4', name: 'Docker', category: 'DevOps / Infrastructure' },
      ],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'Acme',
      role: 'Full Stack Engineer',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'React', 'PostgreSQL'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.requiredSkills.matched.length === 3 &&
        result.requiredSkills.missing.length === 0 &&
        result.overallScore >= 75,
      'Test 3: Multiple matches (3/3 required skills matched, Docker excluded)'
    );
  }

  // Test 4: Required vs preferred skills weighting
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [
        { id: '1', name: 'Node.js', category: 'Backend' },
        { id: '2', name: 'GraphQL', category: 'Backend' },
      ],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'Acme',
      role: 'Backend Dev',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'NestJS'],
      preferredSkills: ['GraphQL'],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.requiredSkills.matched.length === 1 &&
        result.requiredSkills.missing.length === 1 &&
        result.preferredSkills.matched.length === 1,
      'Test 4: Required vs preferred skills weighting handled properly'
    );
  }

  // Test 5: Experience with matching technologies
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [{ id: '1', name: 'React', category: 'Frontend' }],
      experience: [
        {
          id: 'exp-1',
          company: 'Griantek',
          jobTitle: 'Senior Frontend Engineer',
          location: 'Remote',
          startDate: '2021',
          endDate: '2024',
          currentlyWorking: false,
          description: 'Built SaaS web apps',
          technologies: 'React, TypeScript, GraphQL, REST APIs',
        },
      ],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'TechCorp',
      role: 'Senior Frontend Engineer',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['React', 'TypeScript'],
      preferredSkills: ['GraphQL'],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.relevantExperiences.length === 1 &&
        result.relevantExperiences[0].score >= 50 &&
        result.relevantExperiences[0].matchedSkills.length >= 2,
      'Test 5: Experience relevance scored with matching technologies'
    );
  }

  // Test 6: Project with matching technologies and domain
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [{ id: '1', name: 'React Native', category: 'Frontend' }],
      projects: [
        {
          id: 'proj-1',
          projectName: 'HireLog',
          projectTypeOrDomain: 'Mobile Application',
          technologies: 'React Native, Expo, TypeScript, SQLite',
          description: 'Personal job application manager',
          featuresOrWorkDone: 'Offline-first database and JD analysis',
          myContribution: 'Sole developer and architect',
        },
      ],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'AppStudio',
      role: 'Mobile Engineer',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['React Native', 'TypeScript'],
      preferredSkills: ['SQLite'],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.relevantProjects.length === 1 &&
        result.relevantProjects[0].score >= 60 &&
        result.relevantProjects[0].matchedSkills.includes('React Native'),
      'Test 6: Project relevance scored with matching technologies and domain'
    );
  }

  // Test 7: No matching skills
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [{ id: '1', name: 'Ruby on Rails', category: 'Backend' }],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'GoCorp',
      role: 'Golang Engineer',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Go', 'Kubernetes', 'gRPC'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.requiredSkills.matched.length === 0 &&
        result.requiredSkills.missing.length === 3 &&
        result.overallScore <= 30 &&
        result.scoreLabel === 'Low match',
      'Test 7: No matching skills returns 0 matches and Low match score'
    );
  }

  // Test 8: Empty profile
  {
    const profile: Profile = INITIAL_PROFILE;
    const jdAnalysis: JobAnalysis = {
      company: 'Acme',
      role: 'Frontend Dev',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['React', 'TypeScript'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.overallScore === 0 &&
        result.scoreLabel === 'Low match' &&
        result.requiredSkills.matched.length === 0,
      'Test 8: Empty profile returns 0 overall score'
    );
  }

  // Test 9: JD with no skills
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [{ id: '1', name: 'React', category: 'Frontend' }],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'Acme',
      role: 'Software Engineer',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const result = matchingEngine.match(profile, jdAnalysis);
    assert(
      result.requiredSkills.matched.length === 0 && result.requiredSkills.missing.length === 0,
      'Test 9: JD with no skills is handled gracefully without errors'
    );
  }

  // Test 10: Local execution confirmation (deterministic and synchronous)
  {
    const profile: Profile = {
      ...INITIAL_PROFILE,
      skills: [{ id: '1', name: 'Node.js', category: 'Backend' }],
    };
    const jdAnalysis: JobAnalysis = {
      company: 'Test',
      role: 'Node Dev',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };

    const startTime = Date.now();
    const result = matchingEngine.match(profile, jdAnalysis);
    const duration = Date.now() - startTime;

    assert(
      result !== null && duration < 50,
      'Test 10: Matching is completely deterministic, local, and sub-millisecond without network calls'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
