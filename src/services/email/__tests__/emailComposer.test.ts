import {
  formatDefaultSubject,
  formatSignature,
  resolveRecipient,
} from '../emailFormatting';
import { Job } from '@/types/job';
import { Profile } from '@/types/profile';

export function runEmailComposerTests(): { total: number; passed: number; failed: number } {
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

  console.log('\n--- Running Email Composer & Attachment Workflow Tests ---');

  const baseJob: Job = {
    id: 'job-101',
    company: 'Tech Innovations Inc',
    role: 'Senior Full Stack Engineer',
    location: 'Remote',
    jobDescription: 'Looking for a Senior Full Stack Engineer with Node.js and React.',
    applicationEmail: '',
    status: 'Draft',
    analysisStatus: 'Analyzed',
    workflowState: 'CREATED',
    analysis: {
      role: 'Senior Full Stack Engineer',
      company: 'Tech Innovations Inc',
      location: 'Dubai',
      experienceRequirement: '4+ years',
      educationRequirement: "Bachelor's",
      salary: null,
      employmentType: 'Full-time',
      workMode: 'Remote',
      applicationEmail: 'careers@techinnovations.com',
      applicationUrl: null,
      requiredSkills: ['Node.js', 'React'],
      preferredSkills: ['PostgreSQL'],
      responsibilities: ['Build APIs', 'Create UIs'],
      otherRequirements: [],
      analyzedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleProfile: Profile = {
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
      professionalSummary: 'Experienced software developer.',
    },
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  };

  // Test 1: Recipient resolution - JD extracted email (when manual is empty)
  {
    const res = resolveRecipient(baseJob);
    assert(
      res.recipient === 'careers@techinnovations.com' && res.source === 'jd_extracted',
      'Test 1: Extracted JD email is used when no manual email is specified'
    );
  }

  // Test 2: Recipient resolution - Manual email takes precedence over JD email
  {
    const jobWithManual: Job = {
      ...baseJob,
      applicationEmail: 'recruiter.direct@techinnovations.com',
    };
    const res = resolveRecipient(jobWithManual);
    assert(
      res.recipient === 'recruiter.direct@techinnovations.com' && res.source === 'job_manual',
      'Test 2: Manually entered job email takes highest priority over JD analysis'
    );
  }

  // Test 3: Recipient resolution - No email available returns empty
  {
    const jobWithNoEmail: Job = {
      ...baseJob,
      applicationEmail: '',
      analysis: {
        ...baseJob.analysis!,
        applicationEmail: null,
      },
    };
    const res = resolveRecipient(jobWithNoEmail);
    assert(
      res.recipient === '' && res.source === 'none',
      'Test 3: Missing recipient returns empty string without inventing dummy emails'
    );
  }

  // Test 4: Default subject formatting
  {
    const subject = formatDefaultSubject(
      baseJob.role,
      sampleProfile.personalDetails.fullName
    );
    assert(
      subject === 'Application for Senior Full Stack Engineer - Mohammed Antigravity',
      'Test 4: Default subject line includes role and candidate name'
    );
  }

  // Test 5: Default subject with empty role falls back to Software Engineer
  {
    const subject = formatDefaultSubject('', 'Candidate Name');
    assert(
      subject === 'Application for Software Engineer - Candidate Name',
      'Test 5: Empty role falls back gracefully to Software Engineer'
    );
  }

  // Test 6: Deterministic signature formatting
  {
    const signature = formatSignature(sampleProfile);
    assert(
      signature.includes('Best regards,') &&
        signature.includes('Mohammed Antigravity') &&
        signature.includes('mohammed@example.com | +1 234 567 8900') &&
        signature.includes('https://linkedin.com/in/mohammed') &&
        signature.includes('https://mohammed.dev'),
      'Test 6: Signature is deterministically formatted from verified Profile contact fields'
    );
  }

  // Test 7: Signature with minimal profile fields
  {
    const minimalProfile: Profile = {
      ...sampleProfile,
      personalDetails: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '',
        location: '',
        linkedIn: '',
        github: '',
        portfolio: '',
      },
    };
    const signature = formatSignature(minimalProfile);
    assert(
      signature === 'Best regards,\nJane Doe\njane@example.com' &&
        !signature.includes('undefined') &&
        !signature.includes('null'),
      'Test 7: Signature with minimal fields renders cleanly without blank lines or undefined tokens'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
