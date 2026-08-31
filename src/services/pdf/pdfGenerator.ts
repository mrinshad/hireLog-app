import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { CustomizedResume } from '@/types/resume';

/**
 * Escapes HTML entities.
 */
function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates clean, publication-quality A4 HTML from structured CustomizedResume.
 */
export function generateResumeHtml(resume: CustomizedResume): string {
  const p = resume.personalDetails || {};

  const contactItems: string[] = [];
  if (p.phone) contactItems.push(`<span>${escapeHtml(p.phone)}</span>`);
  if (p.email) contactItems.push(`<span>${escapeHtml(p.email)}</span>`);
  if (p.location) contactItems.push(`<span>${escapeHtml(p.location)}</span>`);
  if (p.linkedIn) contactItems.push(`<a href="${escapeHtml(p.linkedIn)}">LinkedIn</a>`);
  if (p.github) contactItems.push(`<a href="${escapeHtml(p.github)}">GitHub</a>`);
  if (p.portfolio) contactItems.push(`<a href="${escapeHtml(p.portfolio)}">Portfolio</a>`);

  // Group skills by category
  const skillsByCategory = (resume.skills || []).reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.category || 'Technical Skills';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {});

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(p.fullName || 'Resume')}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #1a202c;
      background-color: #ffffff;
      padding: 16px;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #2b6cb0;
    }
    .name {
      font-size: 19pt;
      font-weight: 700;
      color: #1a202c;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
    }
    .title {
      font-size: 10.5pt;
      font-weight: 600;
      color: #2b6cb0;
      margin-bottom: 4px;
    }
    .contacts {
      font-size: 8.5pt;
      color: #4a5568;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
    .contacts a {
      color: #2b6cb0;
      text-decoration: none;
    }
    .section {
      margin-bottom: 11px;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #2b6cb0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin-bottom: 5px;
    }
    .summary-text {
      font-size: 8.8pt;
      color: #2d3748;
      text-align: justify;
    }
    .item {
      margin-bottom: 7px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1px;
    }
    .item-title {
      font-size: 9.2pt;
      font-weight: 700;
      color: #1a202c;
    }
    .item-subtitle {
      font-size: 8.8pt;
      font-weight: 600;
      color: #4a5568;
    }
    .item-date {
      font-size: 8.5pt;
      color: #718096;
      font-weight: 500;
      white-space: nowrap;
    }
    .item-location {
      font-size: 8.5pt;
      color: #718096;
      font-style: italic;
    }
    ul {
      margin-left: 14px;
      margin-top: 2px;
    }
    li {
      font-size: 8.5pt;
      color: #2d3748;
      margin-bottom: 2px;
    }
    .skills-category {
      margin-bottom: 3px;
      font-size: 8.5pt;
      color: #2d3748;
    }
    .skills-label {
      font-weight: 700;
      color: #1a202c;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="name">${escapeHtml(p.fullName || 'Candidate')}</div>
    ${resume.targetRole ? `<div class="title">${escapeHtml(resume.targetRole)}</div>` : ''}
    <div class="contacts">
      ${contactItems.join(' &bull; ')}
    </div>
  </div>

  <!-- SUMMARY -->
  ${
    resume.summary
      ? `
  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary-text">${escapeHtml(resume.summary)}</div>
  </div>`
      : ''
  }

  <!-- TECHNICAL SKILLS -->
  ${
    Object.keys(skillsByCategory).length > 0
      ? `
  <div class="section">
    <div class="section-title">Technical Skills</div>
    ${Object.entries(skillsByCategory)
      .map(
        ([category, skillNames]) => `
      <div class="skills-category">
        <span class="skills-label">${escapeHtml(category)}:</span>
        ${escapeHtml(skillNames.join(', '))}
      </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- EXPERIENCE -->
  ${
    resume.experience && resume.experience.length > 0
      ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${resume.experience
      .map(
        (exp) => `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${escapeHtml(exp.jobTitle)}</span>
        <span class="item-date">${escapeHtml([exp.startDate, exp.endDate].filter(Boolean).join(' &ndash; '))}</span>
      </div>
      <div class="item-header">
        <span class="item-subtitle">${escapeHtml(exp.company)}</span>
        ${exp.location ? `<span class="item-location">${escapeHtml(exp.location)}</span>` : ''}
      </div>
      ${
        exp.description
          ? `<ul>${exp.description
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map((b) => `<li>${escapeHtml(b.trim())}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- PROJECTS -->
  ${
    resume.projects && resume.projects.length > 0
      ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${resume.projects
      .map(
        (proj) => `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${escapeHtml(proj.projectName)}</span>
        ${proj.projectTypeOrDomain ? `<span class="item-location">${escapeHtml(proj.projectTypeOrDomain)}</span>` : ''}
      </div>
      ${
        proj.description || proj.featuresOrWorkDone
          ? `<ul>${[proj.description, proj.featuresOrWorkDone]
              .filter(Boolean)
              .join('\n')
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map((b) => `<li>${escapeHtml(b.trim())}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- EDUCATION -->
  ${
    resume.education && resume.education.length > 0
      ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${resume.education
      .map(
        (edu) => `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${escapeHtml(edu.degree)}</span>
        <span class="item-date">${escapeHtml([edu.startDate, edu.endDate].filter(Boolean).join(' &ndash; '))}</span>
      </div>
      <div class="item-header">
        <span class="item-subtitle">${escapeHtml(edu.institution)}</span>
        ${edu.location ? `<span class="item-location">${escapeHtml(edu.location)}</span>` : ''}
      </div>
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- CERTIFICATIONS -->
  ${
    resume.certifications && resume.certifications.length > 0
      ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${resume.certifications
      .map(
        (cert) => `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${escapeHtml(cert.name)}</span>
        <span class="item-date">${escapeHtml(cert.issueDate || '')}</span>
      </div>
      <div class="item-subtitle">${escapeHtml(cert.issuingOrganization)}</div>
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

</body>
</html>
  `.trim();
}

export const localPdfGenerator = {
  /**
   * Generates a PDF file on-device using native print engine.
   * 100% offline, zero network dependencies, saves directly to hireFlow folder.
   */
  async generatePdfFromResume(
    resume: CustomizedResume,
    companyOrJobId: string,
    versionNumber: number | string
  ): Promise<{ pdfPath: string; sizeBytes: number }> {
    const html = generateResumeHtml(resume);

    // Render PDF on-device using native OS engine
    const printResult = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
    });

    const dir = `${FileSystem.documentDirectory}hireFlow/resumes/`;
    const safeCompany = (companyOrJobId || 'hireFlow').replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetFilePath = `${dir}${safeCompany}_v${versionNumber}.pdf`;

    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    // Copy file into hireFlow directory
    await FileSystem.copyAsync({
      from: printResult.uri,
      to: targetFilePath,
    });

    const fileInfo = await FileSystem.getInfoAsync(targetFilePath);

    return {
      pdfPath: targetFilePath,
      sizeBytes: (fileInfo as any).size || 25000,
    };
  },
};
