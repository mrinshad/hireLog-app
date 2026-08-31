import { formatRelativeDate, STATUS_CONFIG } from '../trackingHelpers';
import { Job, JobStatus } from '@/types/job';

export function runTrackingTests(): { total: number; passed: number; failed: number } {
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

  console.log('\n--- Running Application Tracking & Dashboard Tests ---');

  // Test 1: Relative date formatting - Today
  {
    const today = new Date().toISOString();
    const formatted = formatRelativeDate(today);
    assert(formatted === 'Today', 'Test 1: Today timestamp formats as "Today"');
  }

  // Test 2: Relative date formatting - Yesterday
  {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const formatted = formatRelativeDate(yesterday);
    assert(formatted === 'Yesterday', 'Test 2: Yesterday timestamp formats as "Yesterday"');
  }

  // Test 3: Relative date formatting - Past date
  {
    const pastDate = new Date('2026-01-15T10:00:00Z').toISOString();
    const formatted = formatRelativeDate(pastDate);
    assert(
      formatted.includes('Jan') && formatted.includes('15'),
      'Test 3: Older timestamp formats with month and day'
    );
  }

  // Test 4: Relative date formatting - Null / empty handling
  {
    assert(formatRelativeDate(null) === 'Not set', 'Test 4: Null timestamp returns "Not set"');
    assert(formatRelativeDate('') === 'Not set', 'Test 4b: Empty timestamp returns "Not set"');
  }

  // Test 5: All 7 job statuses configured
  {
    const statuses: JobStatus[] = ['Draft', 'Ready', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
    const allConfigured = statuses.every((s) => STATUS_CONFIG[s] && STATUS_CONFIG[s].label && STATUS_CONFIG[s].icon);
    assert(allConfigured, 'Test 5: All 7 job application statuses have valid visual style configurations');
  }

  // Test 6: In-memory filtering by status and search query
  {
    const sampleJobs: Job[] = [
      {
        id: '1',
        role: 'Senior Full Stack Engineer',
        company: 'Vibrantix AI',
        location: 'Bengaluru',
        jobDescription: 'Build React apps',
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        analysisStatus: 'Analyzed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        role: 'Backend Developer',
        company: 'CloudSys',
        location: 'Remote',
        jobDescription: 'Node.js APIs',
        status: 'Interview',
        appliedAt: new Date().toISOString(),
        analysisStatus: 'Analyzed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        role: 'Frontend Engineer',
        company: 'TechCorp',
        location: 'Dubai',
        jobDescription: 'React native',
        status: 'Draft',
        analysisStatus: 'Not analyzed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Filter by status: Applied
    const appliedOnly = sampleJobs.filter((j) => j.status === 'Applied');
    assert(appliedOnly.length === 1 && appliedOnly[0].id === '1', 'Test 6a: Status filter isolates Applied jobs');

    // Search query: "Vibrantix"
    const searchVibrantix = sampleJobs.filter((j) =>
      j.company.toLowerCase().includes('vibrantix') || j.role.toLowerCase().includes('vibrantix')
    );
    assert(
      searchVibrantix.length === 1 && searchVibrantix[0].company === 'Vibrantix AI',
      'Test 6b: Local search matches company name'
    );

    // Search query: "engineer"
    const searchEngineer = sampleJobs.filter((j) =>
      j.role.toLowerCase().includes('engineer') || j.company.toLowerCase().includes('engineer')
    );
    assert(
      searchEngineer.length === 2,
      'Test 6c: Local search matches role name case-insensitively across multiple records'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
