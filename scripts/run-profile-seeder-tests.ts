import { OWNER_PROFILE } from '../src/data/ownerProfileData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n--- Running Profile Seeder & Owner Dataset Tests ---');

// Test 1: Personal Details
assert(
  OWNER_PROFILE.personalDetails.fullName === 'Mohammed Rinshad P',
  'Owner personal full name is Mohammed Rinshad P'
);
assert(
  OWNER_PROFILE.personalDetails.email === 'rinshadmorayur09@gmail.com',
  'Owner email is rinshadmorayur09@gmail.com'
);
assert(
  OWNER_PROFILE.personalDetails.phone === '+91-9895612423',
  'Owner phone is +91-9895612423'
);
assert(
  OWNER_PROFILE.personalDetails.linkedIn === 'https://www.linkedin.com/in/mrinshad/',
  'Owner LinkedIn URL is set correctly'
);
assert(
  OWNER_PROFILE.personalDetails.github === 'https://github.com/mrinshad',
  'Owner GitHub URL is set correctly'
);
assert(
  OWNER_PROFILE.personalDetails.portfolio === 'https://www.mrinshad.site/',
  'Owner Portfolio URL is set correctly'
);

// Test 2: Professional Title & Summary
assert(
  OWNER_PROFILE.professionalInfo.professionalTitle === 'Full-Stack Software Engineer',
  'Professional title is Full-Stack Software Engineer'
);
assert(
  OWNER_PROFILE.professionalInfo.professionalSummary.includes('React, Next.js, Node.js, .NET Core'),
  'Professional summary contains required core stack'
);

// Test 3: Skills Categories
const feSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'Frontend');
const beSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'Backend');
const dbSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'Databases');
const clSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'Cloud');
const doSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'DevOps / Infrastructure');
const tlSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'Tools');
const otSkills = OWNER_PROFILE.skills.filter((s) => s.category === 'Other');

assert(feSkills.map((s) => s.name).includes('React') && feSkills.map((s) => s.name).includes('Next.js'), 'Frontend skills include React and Next.js');
assert(beSkills.map((s) => s.name).includes('Node.js') && beSkills.map((s) => s.name).includes('.NET Core'), 'Backend skills include Node.js and .NET Core');
assert(dbSkills.map((s) => s.name).includes('PostgreSQL') && dbSkills.map((s) => s.name).includes('Prisma ORM'), 'Database skills include PostgreSQL and Prisma ORM');
assert(clSkills.map((s) => s.name).includes('Azure') && clSkills.map((s) => s.name).includes('Google Cloud Platform (GCP)'), 'Cloud skills include Azure and GCP');
assert(doSkills.map((s) => s.name).includes('GitHub Actions') && doSkills.map((s) => s.name).includes('NGINX'), 'DevOps skills include GitHub Actions and NGINX');
assert(tlSkills.map((s) => s.name).includes('Git') && tlSkills.map((s) => s.name).includes('Postman'), 'Tools include Git and Postman');
assert(otSkills.map((s) => s.name).includes('System Design') && otSkills.map((s) => s.name).includes('CI/CD'), 'Engineering skills include System Design and CI/CD');

// Test 4: Experience Records
assert(OWNER_PROFILE.experience.length === 5, 'Exactly 5 experience records configured');
const tcsExp = OWNER_PROFILE.experience.find((e) => e.company.includes('Tata Consultancy Services'));
const bytenExp = OWNER_PROFILE.experience.find((e) => e.company === 'ByteN');
const veynadExp = OWNER_PROFILE.experience.find((e) => e.company.includes('Veynad'));
const griantekExp = OWNER_PROFILE.experience.find((e) => e.company === 'Griantek');
const wizzoExp = OWNER_PROFILE.experience.find((e) => e.company.includes('Wizzo'));

assert(tcsExp !== undefined && tcsExp.startDate === 'Jun 2025' && tcsExp.currentlyWorking === true, 'TCS experience is present with Jun 2025 – Present');
assert(bytenExp !== undefined && bytenExp.jobTitle === 'Technical Lead & Full-Stack Developer' && bytenExp.currentlyWorking === true, 'ByteN leadership role is present with Technical Lead title');
assert(veynadExp !== undefined && veynadExp.location.includes('Melbourne'), 'Veynad Melbourne experience is present');
assert(griantekExp !== undefined && griantekExp.startDate === 'Dec 2024', 'Griantek experience is present');
assert(wizzoExp !== undefined && wizzoExp.startDate === 'Aug 2021', 'Wizzo Technologies experience is present');

// Test 5: Projects Records
assert(OWNER_PROFILE.projects.length === 4, 'Exactly 4 client/platform projects configured');
const schoolProj = OWNER_PROFILE.projects.find((p) => p.projectName.includes('School Management System'));
const crusherProj = OWNER_PROFILE.projects.find((p) => p.projectName.includes('Crusher ERP'));
const evmProj = OWNER_PROFILE.projects.find((p) => p.projectName.includes('Election Voting Machine'));
const byteflowProj = OWNER_PROFILE.projects.find((p) => p.projectName.includes('byteFlow'));

assert(schoolProj !== undefined && schoolProj.technologies.includes('Prisma ORM'), 'School Management System project is present with Prisma');
assert(crusherProj !== undefined && crusherProj.projectTypeOrDomain.includes('Industrial Accounting'), 'Crusher ERP project is present with Industrial Accounting domain');
assert(evmProj !== undefined && evmProj.description.includes('Electronic Voting Machine'), 'EVM Simulator project is present');
assert(byteflowProj !== undefined && byteflowProj.projectTypeOrDomain.includes('Productivity'), 'byteFlow Kanban platform is present');

// Test 6: Education Records
assert(OWNER_PROFILE.education.length === 2, 'Exactly 2 education records configured');
const maceEdu = OWNER_PROFILE.education.find((e) => e.institution.includes('Mar Athanasius'));
const aknmEdu = OWNER_PROFILE.education.find((e) => e.institution.includes('AKNM GPTC'));

assert(maceEdu !== undefined && maceEdu.degree.includes('Data Science'), 'MACE B.Tech Data Science education is present');
assert(aknmEdu !== undefined && aknmEdu.degree.includes('Diploma in Computer Engineering'), 'AKNM Diploma education is present');

// Test 7: Password Gate Validation Logic
const SEED_GATE_PIN = '9895';
const verifyPin = (pin: string) => pin.trim() === SEED_GATE_PIN;

assert(verifyPin('9895') === true, 'Password 9895 passes verification');
assert(verifyPin(' 9895 ') === true, 'Password with whitespace is trimmed and passes');
assert(verifyPin('1234') === false, 'Incorrect password 1234 fails verification');
assert(verifyPin('admin') === false, 'Incorrect password admin fails verification');
assert(verifyPin('') === false, 'Empty password fails verification');

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('❌ Profile Seeder tests failed!');
  process.exit(1);
} else {
  console.log('✅ All Profile Seeder and Owner Dataset tests passed successfully!');
}
