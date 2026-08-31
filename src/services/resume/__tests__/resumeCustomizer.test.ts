import { JobAnalysis } from '@/types/job';
import { INITIAL_PROFILE, Profile } from '@/types/profile';
import { matchingEngine } from '../../matching/matchingEngine';
import { resumeCustomizer } from '../resumeCustomizer';

export function runResumeCustomizerTests(): { total: number; passed: number; failed: number } {
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

  console.log('\n--- Running Resume Customization Engine Tests ---');

  const baseProfile: Profile = {
    ...INITIAL_PROFILE,
    personalDetails: {
      fullName: 'Mohammed Antigravity',
      email: 'mohammed@example.com',
      phone: '+1 234 567 8900',
      location: 'Dubai, UAE',
      linkedIn: 'https://linkedin.com/in/mohammed',
      github: 'https://github.com/mohammed',
      portfolio: 'https://mohammed.dev',
    },
    professionalInfo: {
      professionalTitle: 'Full Stack Engineer',
      professionalSummary: 'Experienced Full Stack Engineer specializing in TypeScript, Node.js, and modern databases.',
    },
    skills: [
      { id: 's-1', name: 'Node.js', category: 'Backend' },
      { id: 's-2', name: 'React', category: 'Frontend' },
      { id: 's-3', name: 'PostgreSQL', category: 'Databases' },
      { id: 's-4', name: 'TypeScript', category: 'Programming Languages' },
      { id: 's-5', name: '.NET', category: 'Backend' },
      { id: 's-6', name: 'C#', category: 'Programming Languages' },
      { id: 's-7', name: 'SQL Server', category: 'Databases' },
      { id: 's-8', name: 'Docker', category: 'DevOps / Infrastructure' },
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Griantek Solutions',
        jobTitle: 'Senior Full Stack Developer',
        location: 'Remote',
        startDate: '2022-01',
        endDate: 'Present',
        currentlyWorking: true,
        description: 'Developed scalable Node.js microservices and React frontends.',
        technologies: 'Node.js, React, PostgreSQL, TypeScript, Docker',
      },
      {
        id: 'exp-2',
        company: 'Legacy Corp',
        jobTitle: '.NET Backend Developer',
        location: 'On-site',
        startDate: '2019-01',
        endDate: '2021-12',
        currentlyWorking: false,
        description: 'Maintained enterprise .NET and C# applications with SQL Server.',
        technologies: '.NET, C#, SQL Server',
      },
    ],
    projects: [
      {
        id: 'proj-1',
        projectName: 'School ERP',
        projectTypeOrDomain: 'ERP & Accounting',
        technologies: 'Node.js, PostgreSQL, React, TypeScript',
        description: 'Comprehensive school management system.',
        featuresOrWorkDone: 'Student billing, attendance tracking, REST API integration.',
        myContribution: 'Lead backend architecture and database schema design.',
      },
      {
        id: 'proj-2',
        projectName: 'Crusher Inventory System',
        projectTypeOrDomain: 'Industrial IoT & Management',
        technologies: '.NET, C#, SQL Server',
        description: 'Quarry inventory management application.',
        featuresOrWorkDone: 'Weighbridge integration, automated invoicing.',
        myContribution: 'Full system development.',
      },
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'B.S. in Computer Science',
        institution: 'University of Engineering',
        location: 'Dubai',
        startDate: '2015',
        endDate: '2019',
        description: 'Graduated with honors.',
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Developer',
        issuingOrganization: 'Amazon Web Services',
        issueDate: '2023',
      },
    ],
  };

  // Test 1: JD with strong Node.js match
  {
    const jdAnalysis: JobAnalysis = {
      company: 'TechCorp',
      role: 'Senior Node.js Backend Engineer',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'PostgreSQL', 'TypeScript'],
      preferredSkills: ['Docker'],
      responsibilities: ['Build high throughput microservices'],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-1');

    assert(
      resume.skills[0].name === 'Node.js' &&
        resume.skills.some((s) => s.name === 'PostgreSQL') &&
        resume.experience[0].company === 'Griantek Solutions',
      'Test 1: JD with strong Node.js match selects Node.js skills and Griantek experience first'
    );
  }

  // Test 2: JD with strong .NET match
  {
    const jdAnalysis: JobAnalysis = {
      company: 'Enterprise Inc',
      role: '.NET Software Engineer',
      location: 'On-site',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['.NET', 'C#', 'SQL Server'],
      preferredSkills: [],
      responsibilities: ['Maintain enterprise C# backend'],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-2');

    assert(
      resume.experience[0].company === 'Legacy Corp' &&
        resume.projects[0].projectName === 'Crusher Inventory System',
      'Test 2: JD with strong .NET match ranks Legacy Corp and Crusher Inventory System first'
    );
  }

  // Test 3: JD with strong frontend match
  {
    const jdAnalysis: JobAnalysis = {
      company: 'WebStudio',
      role: 'Frontend React Developer',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['React', 'TypeScript'],
      preferredSkills: [],
      responsibilities: ['Build modern web UI'],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-3');

    assert(
      resume.skills.some((s) => s.name === 'React' && s.priority === 'required'),
      'Test 3: JD with strong frontend match prioritizes React as required skill'
    );
  }

  // Test 4: JD with skills the user does not have (unmatched skills excluded from resume skills)
  {
    const jdAnalysis: JobAnalysis = {
      company: 'CloudTech',
      role: 'Cloud Architect',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'NestJS', 'AWS Lambda', 'Terraform'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-4');

    const resumeSkillNames = resume.skills.map((s) => s.name);
    assert(
      !resumeSkillNames.includes('NestJS') &&
        !resumeSkillNames.includes('AWS Lambda') &&
        !resumeSkillNames.includes('Terraform') &&
        resume.unmatchedJdSkills.includes('NestJS'),
      'Test 4: Unmatched JD skills (NestJS, AWS Lambda, Terraform) are excluded from resume skills and kept in unmatched list'
    );
  }

  // Test 5: JD with no matching skills
  {
    const jdAnalysis: JobAnalysis = {
      company: 'RubyShop',
      role: 'Ruby Developer',
      location: 'Remote',
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Ruby on Rails', 'Elixir'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-5');

    assert(
      resume.skills.every((s) => s.priority === 'general') &&
        resume.unmatchedJdSkills.includes('Ruby on Rails'),
      'Test 5: JD with no matching skills marks all included skills as general and lists Ruby in unmatched'
    );
  }

  // Test 6: Relevant project selection
  {
    const jdAnalysis: JobAnalysis = {
      company: 'ERPCo',
      role: 'ERP Solutions Architect',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'PostgreSQL'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-6');

    assert(
      resume.projects[0].projectName === 'School ERP',
      'Test 6: Relevant project selection ranks School ERP #1 for ERP/Node.js JD'
    );
  }

  // Test 7: Relevant experience selection
  {
    const jdAnalysis: JobAnalysis = {
      company: 'Microservices Ltd',
      role: 'Microservices Developer',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'Docker'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-7');

    assert(
      resume.experience[0].company === 'Griantek Solutions',
      'Test 7: Relevant experience selection ranks Griantek Solutions #1'
    );
  }

  // Test 8: Required skills prioritized over preferred skills
  {
    const jdAnalysis: JobAnalysis = {
      company: 'DualTech',
      role: 'Full Stack Engineer',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['TypeScript'],
      preferredSkills: ['Docker'],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-8');

    const tsIndex = resume.skills.findIndex((s) => s.name === 'TypeScript');
    const dockerIndex = resume.skills.findIndex((s) => s.name === 'Docker');

    assert(
      tsIndex !== -1 && dockerIndex !== -1 && tsIndex < dockerIndex,
      'Test 8: Required skill (TypeScript) appears before preferred skill (Docker)'
    );
  }

  // Test 9: No invented skills
  {
    const jdAnalysis: JobAnalysis = {
      company: 'AI Startup',
      role: 'AI Engineer',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['PyTorch', 'TensorFlow', 'CUDA', 'Python'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-9');

    const profileSkillIds = new Set(baseProfile.skills.map((s) => s.id));
    const allSkillsValid = resume.skills.every((s) => profileSkillIds.has(s.profileId));

    assert(
      allSkillsValid && !resume.skills.some((s) => s.name === 'PyTorch'),
      'Test 9: No invented skills - every single skill in resume maps to a verified profile skill ID'
    );
  }

  // Test 10: No invented experience
  {
    const jdAnalysis: JobAnalysis = {
      company: 'BigBank',
      role: 'Cobol Specialist',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['COBOL'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-10');

    const profileExpIds = new Set(baseProfile.experience.map((e) => e.id));
    const allExpValid = resume.experience.every((e) => profileExpIds.has(e.profileId));

    assert(
      allExpValid && resume.experience.length === baseProfile.experience.length,
      'Test 10: No invented experience - every experience maps to a verified profile experience ID'
    );
  }

  // Test 11: Every selected item contains a valid Profile ID
  {
    const jdAnalysis: JobAnalysis = {
      company: 'Acme',
      role: 'Full Stack Dev',
      location: null,
      experienceRequirement: null,
      educationRequirement: null,
      salary: null,
      employmentType: null,
      workMode: null,
      applicationEmail: null,
      applicationUrl: null,
      requiredSkills: ['Node.js', 'React'],
      preferredSkills: [],
      responsibilities: [],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    };
    const match = matchingEngine.match(baseProfile, jdAnalysis);
    const resume = resumeCustomizer.customize(baseProfile, jdAnalysis, match, 'job-11');

    const hasSkillsIds = resume.skills.every((s) => s.profileId && s.profileId.length > 0);
    const hasExpIds = resume.experience.every((e) => e.profileId && e.profileId.length > 0);
    const hasProjIds = resume.projects.every((p) => p.profileId && p.profileId.length > 0);
    const hasEduIds = resume.education.every((ed) => ed.profileId && ed.profileId.length > 0);
    const hasCertIds = resume.certifications.every((c) => c.profileId && c.profileId.length > 0);

    assert(
      hasSkillsIds && hasExpIds && hasProjIds && hasEduIds && hasCertIds,
      'Test 11: 100% Traceability - every single item in skills, experience, projects, education, and certs contains valid profileId'
    );
  }

  // Test 12: Empty Profile handled safely
  {
    const jdAnalysis: JobAnalysis = {
      company: 'Acme',
      role: 'Dev',
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
    const match = matchingEngine.match(INITIAL_PROFILE, jdAnalysis);
    const resume = resumeCustomizer.customize(INITIAL_PROFILE, jdAnalysis, match, 'job-12');

    assert(
      resume.skills.length === 0 &&
        resume.experience.length === 0 &&
        resume.projects.length === 0 &&
        resume.overallMatchScore === 0,
      'Test 12: Empty profile is handled safely without runtime errors'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
