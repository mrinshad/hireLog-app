import { CustomizedResume } from '@/types/resume';
import { escapeLatex, escapeMultilineToItems } from './escape';
import { TemplateConfig } from './types';

export const MASTER_TEMPLATE_VERSION = 'master-v1';

/**
 * Standard Canonical Categories for Master Resume Skills
 */
const CANONICAL_CATEGORIES: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  databases: 'Databases & ORM',
  'databases & orm': 'Databases & ORM',
  cloud: 'Cloud, Infra & DevOps',
  'devops / infrastructure': 'Cloud, Infra & DevOps',
  'cloud, infra & devops': 'Cloud, Infra & DevOps',
  tools: 'Tools',
  'programming languages': 'Software Engineering',
  'software engineering': 'Software Engineering',
  other: 'Technical Skills',
};

/**
 * Renders the Master Resume LaTeX Preamble containing all 9 custom macros.
 */
export function renderPreamble(config: TemplateConfig): string {
  return `%-------------------------
% Master Resume Template (${config.templateVersion || MASTER_TEMPLATE_VERSION})
% ATS-Compliant Layout
%-------------------------

\\documentclass[letterpaper,${config.fontSize || '10.5pt'}]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{geometry}

\\geometry{letterpaper, margin=${config.marginSize || '0.5in'}}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.0in}
\\addtolength{\\evensidemargin}{-0.0in}
\\addtolength{\\textwidth}{0.0in}
\\addtolength{\\topmargin}{-0.0in}
\\addtolength{\\textheight}{0.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

%-------------------------
% Custom Master Resume Macros
%-------------------------
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
  \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      #1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
`;
}

/**
 * Renders the Master Resume Header with Name and hyperlinked Contact Items.
 */
export function renderHeader(
  resume: CustomizedResume,
  config: TemplateConfig
): string {
  const p = resume.personalDetails;
  const name = escapeLatex(p.fullName || 'Candidate Name');

  const contactItems: string[] = [];

  if (p.email) {
    const emailEscaped = escapeLatex(p.email);
    contactItems.push(`\\href{mailto:${p.email}}{${emailEscaped}}`);
  }
  if (p.phone) {
    contactItems.push(escapeLatex(p.phone));
  }
  if (config.includeLocationInHeader && p.location) {
    contactItems.push(escapeLatex(p.location));
  }
  if (p.linkedIn) {
    const cleanUrl = p.linkedIn.replace(/^https?:\/\//, '');
    contactItems.push(`\\href{${p.linkedIn}}{${escapeLatex(cleanUrl)}}`);
  }
  if (p.github) {
    const cleanUrl = p.github.replace(/^https?:\/\//, '');
    contactItems.push(`\\href{${p.github}}{${escapeLatex(cleanUrl)}}`);
  }
  if (p.portfolio) {
    const cleanUrl = p.portfolio.replace(/^https?:\/\//, '');
    contactItems.push(`\\href{${p.portfolio}}{${escapeLatex(cleanUrl)}}`);
  }

  const contactLine = contactItems.join(' $|$ ');

  return `%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{3pt}
    \\small ${contactLine}
\\end{center}
`;
}

/**
 * Renders the Professional Summary section.
 */
export function renderSummary(resume: CustomizedResume): string {
  if (!resume.summary || !resume.summary.trim()) {
    return '';
  }

  return `%-----------SUMMARY-----------
\\section{Professional Summary}
\\small{
  ${escapeLatex(resume.summary.trim())}
}
\\vspace{-4pt}
`;
}

/**
 * Renders Technical Skills organized by master canonical categories.
 */
export function renderSkills(resume: CustomizedResume): string {
  if (!resume.skills || resume.skills.length === 0) {
    return '';
  }

  // Group skills by category with canonical grouping
  const categoriesMap = new Map<string, string[]>();

  resume.skills.forEach((skill) => {
    const rawCat = (skill.category || 'Other').toLowerCase().trim();
    const standardCat = CANONICAL_CATEGORIES[rawCat] || skill.category || 'Technical Skills';

    if (!categoriesMap.has(standardCat)) {
      categoriesMap.set(standardCat, []);
    }
    categoriesMap.get(standardCat)!.push(escapeLatex(skill.name));
  });

  const categoryLines: string[] = [];
  categoriesMap.forEach((skillsList, categoryName) => {
    categoryLines.push(
      `\\textbf{${escapeLatex(categoryName)}}{: ${skillsList.join(', ')}}`
    );
  });

  return `%-----------TECHNICAL SKILLS-----------
\\section{Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
      ${categoryLines.join(' \\\\\n      ')}
    }}
\\end{itemize}
\\vspace{-12pt}
`;
}

/**
 * Renders Experience section using \resumeSubheading and itemized bullets.
 */
export function renderExperience(
  resume: CustomizedResume,
  config: TemplateConfig
): string {
  if (!resume.experience || resume.experience.length === 0) {
    return '';
  }

  const list = config.maxExperience
    ? resume.experience.slice(0, config.maxExperience)
    : resume.experience;

  const experienceBlocks = list.map((exp) => {
    const company = escapeLatex(exp.company || 'Company');
    const jobTitle = escapeLatex(exp.jobTitle || 'Role');
    const location = escapeLatex(exp.location || '');
    const dateRange = `${escapeLatex(exp.startDate || '')} -- ${
      exp.currentlyWorking ? 'Present' : escapeLatex(exp.endDate || '')
    }`;

    const items: string[] = [];

    // Description bullets
    if (exp.description) {
      const parsedBullets = escapeMultilineToItems(exp.description);
      items.push(...parsedBullets);
    }

    // Key technologies highlight bullet if present
    if (exp.technologies) {
      items.push(`\\textbf{Technologies:} ${escapeLatex(exp.technologies)}`);
    }

    const itemsContent =
      items.length > 0
        ? `\\resumeItemListStart
        ${items.map((it) => `\\resumeItem{${it}}`).join('\n        ')}
      \\resumeItemListEnd`
        : '';

    return `    \\resumeSubheading
      {${jobTitle}}{${dateRange}}
      {${company}}{${location}}
      ${itemsContent}`;
  });

  return `%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${experienceBlocks.join('\n')}
  \\resumeSubHeadingListEnd
`;
}

/**
 * Renders Selected Projects section using \resumeProjectHeading and itemized bullets.
 */
export function renderProjects(
  resume: CustomizedResume,
  config: TemplateConfig
): string {
  if (!resume.projects || resume.projects.length === 0) {
    return '';
  }

  const list = config.maxProjects
    ? resume.projects.slice(0, config.maxProjects)
    : resume.projects;

  const projectBlocks = list.map((proj) => {
    const name = escapeLatex(proj.projectName || 'Project');
    const domain = proj.projectTypeOrDomain
      ? escapeLatex(proj.projectTypeOrDomain)
      : '';
    const tech = proj.technologies ? escapeLatex(proj.technologies) : '';

    const headingLeft = tech
      ? `\\textbf{${name}} $|$ \\emph{${tech}}`
      : `\\textbf{${name}}`;

    const items: string[] = [];

    if (proj.description) {
      items.push(...escapeMultilineToItems(proj.description));
    }
    if (proj.featuresOrWorkDone) {
      items.push(...escapeMultilineToItems(proj.featuresOrWorkDone));
    }
    if (proj.myContribution) {
      items.push(
        `\\textbf{Contribution:} ${escapeLatex(proj.myContribution)}`
      );
    }

    const itemsContent =
      items.length > 0
        ? `\\resumeItemListStart
        ${items.map((it) => `\\resumeItem{${it}}`).join('\n        ')}
      \\resumeItemListEnd`
        : '';

    return `    \\resumeProjectHeading
      {${headingLeft}}{${domain}}
      ${itemsContent}`;
  });

  return `%-----------SELECTED PROJECTS-----------
\\section{Selected Projects}
  \\resumeSubHeadingListStart
${projectBlocks.join('\n')}
  \\resumeSubHeadingListEnd
`;
}

/**
 * Renders Education section using \resumeSubheading.
 */
export function renderEducation(resume: CustomizedResume): string {
  if (!resume.education || resume.education.length === 0) {
    return '';
  }

  const educationBlocks = resume.education.map((edu) => {
    const degree = escapeLatex(edu.degree || 'Degree');
    const institution = escapeLatex(edu.institution || 'University');
    const location = escapeLatex(edu.location || '');
    const dateRange = edu.startDate
      ? `${escapeLatex(edu.startDate)} -- ${escapeLatex(edu.endDate || '')}`
      : escapeLatex(edu.endDate || '');

    const descItem = edu.description
      ? `\\resumeItemListStart
        \\resumeItem{${escapeLatex(edu.description)}}
      \\resumeItemListEnd`
      : '';

    return `    \\resumeSubheading
      {${institution}}{${location}}
      {${degree}}{${dateRange}}
      ${descItem}`;
  });

  return `%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${educationBlocks.join('\n')}
  \\resumeSubHeadingListEnd
`;
}

/**
 * Renders optional Certifications section.
 */
export function renderCertifications(resume: CustomizedResume): string {
  if (!resume.certifications || resume.certifications.length === 0) {
    return '';
  }

  const certItems = resume.certifications.map((cert) => {
    const name = escapeLatex(cert.name);
    const org = escapeLatex(cert.issuingOrganization);
    const date = escapeLatex(cert.issueDate);
    const cred = cert.credentialId
      ? ` $|$ \\small{ID: ${escapeLatex(cert.credentialId)}}`
      : '';

    return `\\resumeItem{\\textbf{${name}} -- ${org} (${date})${cred}}`;
  });

  return `%-----------CERTIFICATIONS-----------
\\section{Certifications}
  \\resumeItemListStart
    ${certItems.join('\n    ')}
  \\resumeItemListEnd
`;
}
