import { CustomizedResume } from '@/types/resume';
import { escapeLatex } from '../escape';
import { latexRenderer } from '../latexRenderer';

export function runLatexRendererTests(): { total: number; passed: number; failed: number } {
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

  console.log('\n--- Running LaTeX Resume Engine Tests ---');

  const baseResume: CustomizedResume = {
    jobId: 'job-101',
    targetRole: 'Senior Full Stack Engineer',
    targetCompany: 'Tech Corp',
    personalDetails: {
      fullName: 'Mohammed Antigravity',
      email: 'mohammed@example.com',
      phone: '+1 234 567 8900',
      location: 'Dubai, UAE',
      linkedIn: 'https://linkedin.com/in/mohammed',
      github: 'https://github.com/mohammed',
      portfolio: 'https://mohammed.dev',
    },
    summary: 'Full Stack Engineer with strong expertise in TypeScript, Node.js, and React.',
    skills: [
      { profileId: 's-1', name: 'Node.js', category: 'Backend', priority: 'required', displayOrder: 1 },
      { profileId: 's-2', name: 'React', category: 'Frontend', priority: 'required', displayOrder: 2 },
      { profileId: 's-3', name: 'PostgreSQL', category: 'Databases', priority: 'preferred', displayOrder: 3 },
      { profileId: 's-4', name: 'TypeScript', category: 'Programming Languages', priority: 'general', displayOrder: 4 },
    ],
    experience: [
      {
        profileId: 'exp-1',
        company: 'Griantek Solutions',
        jobTitle: 'Senior Full Stack Developer',
        location: 'Remote',
        startDate: '2022-01',
        endDate: 'Present',
        currentlyWorking: true,
        description: 'Developed scalable Node.js microservices & React web applications.',
        technologies: 'Node.js, React, PostgreSQL, TypeScript',
        matchedSkills: ['Node.js', 'React'],
        relevanceScore: 85,
        displayOrder: 1,
      },
    ],
    projects: [
      {
        profileId: 'proj-1',
        projectName: 'School ERP',
        projectTypeOrDomain: 'ERP & Accounting',
        technologies: 'Node.js, PostgreSQL, React',
        description: 'Multi-tenant school management ERP.',
        featuresOrWorkDone: 'Automated billing & fee collection.',
        myContribution: 'Architected backend and schema design.',
        matchedSkills: ['Node.js', 'PostgreSQL'],
        relevanceScore: 90,
        displayOrder: 1,
      },
    ],
    education: [
      {
        profileId: 'edu-1',
        degree: 'B.S. in Computer Science',
        institution: 'University of Technology',
        location: 'Dubai',
        startDate: '2015',
        endDate: '2019',
        description: 'Graduated with First Class Honors.',
        displayOrder: 1,
      },
    ],
    certifications: [
      {
        profileId: 'cert-1',
        name: 'AWS Solutions Architect',
        issuingOrganization: 'Amazon Web Services',
        issueDate: '2023',
        credentialId: 'AWS-12345',
        displayOrder: 1,
      },
    ],
    unmatchedJdSkills: ['NestJS'],
    overallMatchScore: 85,
    generatedAt: new Date().toISOString(),
  };

  // Test 1: Full profile rendering
  {
    const latex = latexRenderer.render(baseResume);
    assert(
      latex.includes('\\documentclass') &&
        latex.includes('\\begin{document}') &&
        latex.includes('\\end{document}') &&
        latex.includes('Mohammed Antigravity') &&
        latex.includes('\\section{Professional Summary}') &&
        latex.includes('\\section{Technical Skills}') &&
        latex.includes('\\section{Experience}') &&
        latex.includes('\\section{Projects}') &&
        latex.includes('\\section{Education}') &&
        latex.includes('\\section{Certifications}'),
      'Test 1: Full profile renders complete LaTeX document structure'
    );
  }

  // Test 2: Profile with no certifications omits section cleanly
  {
    const resumeNoCert: CustomizedResume = {
      ...baseResume,
      certifications: [],
    };
    const latex = latexRenderer.render(resumeNoCert);
    assert(
      !latex.includes('\\section{Certifications}') && latex.includes('\\end{document}'),
      'Test 2: Profile with no certifications omits Certifications section cleanly without empty headers'
    );
  }

  // Test 3: Profile with multiple projects
  {
    const resumeMultiProj: CustomizedResume = {
      ...baseResume,
      projects: [
        baseResume.projects[0],
        {
          profileId: 'proj-2',
          projectName: 'Crusher Management System',
          projectTypeOrDomain: 'Industrial Systems',
          technologies: '.NET, C#, SQL Server',
          description: 'Quarry operations and weighbridge tracking.',
          featuresOrWorkDone: 'Realtime telemetry.',
          myContribution: 'Full stack development.',
          matchedSkills: [],
          relevanceScore: 50,
          displayOrder: 2,
        },
      ],
    };
    const latex = latexRenderer.render(resumeMultiProj);
    assert(
      latex.includes('School ERP') && latex.includes('Crusher Management System'),
      'Test 3: Multiple projects are formatted and rendered in ordered subheadings'
    );
  }

  // Test 4: Special LaTeX character escaping
  {
    const textWithSpecials = 'R&D at AT&T with 100% test coverage & $50k cost reduction #1 {Node_js} ~ ^ <script> \\';
    const escaped = escapeLatex(textWithSpecials);

    assert(
      escaped.includes('R\\&D') &&
        escaped.includes('AT\\&T') &&
        escaped.includes('100\\%') &&
        escaped.includes('\\$50k') &&
        escaped.includes('\\#1') &&
        escaped.includes('\\{Node\\_js\\}') &&
        escaped.includes('\\textasciitilde{}') &&
        escaped.includes('\\textasciicircum{}') &&
        escaped.includes('\\textless{}script\\textgreater{}') &&
        escaped.includes('\\textbackslash{}'),
      'Test 4: Special characters (&, %, $, #, _, {, }, ~, ^, <, >, \\) are properly escaped'
    );
  }

  // Test 5: Escaping in user resume fields
  {
    const resumeWithSpecials: CustomizedResume = {
      ...baseResume,
      skills: [
        { profileId: 's-1', name: 'C#', category: 'Programming Languages', priority: 'required', displayOrder: 1 },
        { profileId: 's-2', name: 'C++', category: 'Programming Languages', priority: 'required', displayOrder: 2 },
        { profileId: 's-3', name: 'CI/CD & DevOps', category: 'DevOps / Infrastructure', priority: 'preferred', displayOrder: 3 },
      ],
      experience: [
        {
          ...baseResume.experience[0],
          description: 'Reduced infrastructure cost by 25% across 10+ microservices & APIs.',
        },
      ],
    };
    const latex = latexRenderer.render(resumeWithSpecials);
    assert(
      latex.includes('C\\#') &&
        latex.includes('CI/CD \\& DevOps') &&
        latex.includes('25\\%') &&
        latex.includes('microservices \\& APIs'),
      'Test 5: User experience descriptions and skills with special characters are safely escaped in rendered LaTeX'
    );
  }

  // Test 6: Custom section order & visibility configuration
  {
    const customConfig = {
      sectionOrder: ['skills' as const, 'experience' as const, 'projects' as const],
      showSummary: false,
      showEducation: false,
      showCertifications: false,
    };
    const latex = latexRenderer.render(baseResume, customConfig);

    const skillsPos = latex.indexOf('\\section{Technical Skills}');
    const expPos = latex.indexOf('\\section{Experience}');

    assert(
      skillsPos !== -1 &&
        expPos !== -1 &&
        skillsPos < expPos &&
        !latex.includes('\\section{Professional Summary}') &&
        !latex.includes('\\section{Education}'),
      'Test 6: Template configuration respects custom section ordering and section visibility flags'
    );
  }

  // Test 7: No fabricated data in rendered output
  {
    const latex = latexRenderer.render(baseResume);
    assert(
      !latex.includes('NestJS') && latex.includes('Griantek Solutions'),
      'Test 7: Unmatched JD skills (NestJS) are omitted from rendered LaTeX, preserving 100% truth'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
