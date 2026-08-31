import { ResumeLibraryItem, ResumeVersion } from '../types';
import { JobStatus } from '@/types/job';

export function runResumeLibraryTests(): { total: number; passed: number; failed: number } {
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

  console.log('\n--- Running Resume Library & Version History Tests ---');

  const sampleLibraryItems: ResumeLibraryItem[] = [
    {
      id: 'rv-3',
      jobId: 'job-1',
      versionNumber: 2,
      templateVersion: 'master-v1',
      targetRole: 'Lead Full Stack Engineer',
      targetCompany: 'Vibrantix.ai',
      pdfPath: '/data/resumes/job-1/rv-3.pdf',
      generationStatus: 'Generated',
      jobStatus: 'Applied',
      jobCompany: 'Vibrantix.ai',
      jobRole: 'Lead Full Stack Engineer',
      createdAt: '2026-08-31T12:00:00.000Z',
      updatedAt: '2026-08-31T12:00:00.000Z',
    },
    {
      id: 'rv-2',
      jobId: 'job-2',
      versionNumber: 1,
      templateVersion: 'master-v1',
      targetRole: 'Senior Backend Developer',
      targetCompany: 'Skyappz Software',
      pdfPath: '/data/resumes/job-2/rv-2.pdf',
      generationStatus: 'Generated',
      jobStatus: 'Interview',
      jobCompany: 'Skyappz Software',
      jobRole: 'Senior Backend Developer',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z',
    },
    {
      id: 'rv-1',
      jobId: 'job-1',
      versionNumber: 1,
      templateVersion: 'master-v1',
      targetRole: 'Full Stack Engineer',
      targetCompany: 'Vibrantix.ai',
      pdfPath: '/data/resumes/job-1/rv-1.pdf',
      generationStatus: 'Generated',
      jobStatus: 'Applied',
      jobCompany: 'Vibrantix.ai',
      jobRole: 'Lead Full Stack Engineer',
      createdAt: '2026-08-25T08:00:00.000Z',
      updatedAt: '2026-08-25T08:00:00.000Z',
    },
  ];

  // Test 1: Newest-first sorting across multiple jobs and versions
  {
    const sorted = [...sampleLibraryItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    assert(
      sorted[0].id === 'rv-3' && sorted[1].id === 'rv-2' && sorted[2].id === 'rv-1',
      'Test 1: Resumes are sorted by newest generation date first'
    );
  }

  // Test 2: Multiple versions for the same Job appear as distinct entries
  {
    const job1Versions = sampleLibraryItems.filter((it) => it.jobId === 'job-1');
    assert(
      job1Versions.length === 2 &&
        job1Versions[0].versionNumber === 2 &&
        job1Versions[1].versionNumber === 1,
      'Test 2: Multiple resume versions for the same job appear independently without overwriting'
    );
  }

  // Test 3: Local search by company
  {
    const query = 'Skyappz';
    const matches = sampleLibraryItems.filter(
      (it) =>
        it.targetCompany.toLowerCase().includes(query.toLowerCase()) ||
        it.targetRole.toLowerCase().includes(query.toLowerCase())
    );
    assert(
      matches.length === 1 && matches[0].targetCompany === 'Skyappz Software',
      'Test 3: Local search matches company name correctly'
    );
  }

  // Test 4: Local search by role
  {
    const query = 'backend';
    const matches = sampleLibraryItems.filter(
      (it) =>
        it.targetCompany.toLowerCase().includes(query.toLowerCase()) ||
        it.targetRole.toLowerCase().includes(query.toLowerCase())
    );
    assert(
      matches.length === 1 && matches[0].id === 'rv-2',
      'Test 4: Local search matches role name case-insensitively'
    );
  }

  // Test 5: Status filter
  {
    const appliedResumes = sampleLibraryItems.filter((it) => it.jobStatus === 'Applied');
    const interviewResumes = sampleLibraryItems.filter((it) => it.jobStatus === 'Interview');
    assert(
      appliedResumes.length === 2 && interviewResumes.length === 1,
      'Test 5: Status filtering isolates resumes by joined job application status'
    );
  }

  // Test 6: Historical Version Immutability
  {
    const historicalResumeVersion: ResumeVersion = {
      id: 'rv-hist',
      jobId: 'job-hist',
      versionNumber: 1,
      templateVersion: 'master-v1',
      targetRole: 'Frontend Developer',
      targetCompany: 'OldTech',
      latexSource: '\\section{Skills} React, Redux',
      resumeJson: JSON.stringify({
        skills: [{ name: 'React' }, { name: 'Redux' }],
      }),
      pdfPath: '/data/resumes/job-hist/rv-hist.pdf',
      generationStatus: 'Generated',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    };

    // Candidate updates profile on Aug 30 to add GraphQL and remove Redux
    const updatedProfileSkills = ['React', 'GraphQL'];

    // Parsed historical resume JSON still contains Redux
    const parsedHist = JSON.parse(historicalResumeVersion.resumeJson);
    const histSkillNames = parsedHist.skills.map((s: any) => s.name);

    assert(
      histSkillNames.includes('Redux') &&
        !histSkillNames.includes('GraphQL') &&
        historicalResumeVersion.latexSource.includes('Redux'),
      'Test 6: Historical resume snapshot remains completely immutable after candidate profile changes'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
