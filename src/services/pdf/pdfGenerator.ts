import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { errorLogger } from '@/services/logging/errorLogger';
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
  if (p.phone) contactItems.push(escapeHtml(p.phone));
  if (p.email) contactItems.push(escapeHtml(p.email));
  if (p.location) contactItems.push(escapeHtml(p.location));
  if (p.linkedIn) contactItems.push('LinkedIn');
  if (p.github) contactItems.push('GitHub');
  if (p.portfolio) contactItems.push('Portfolio');

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
      margin: 14mm 14mm;
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
      color: #1E293B;
      background-color: #ffffff;
      padding: 4px;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
    }
    .name {
      font-size: 20pt;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    .contacts {
      font-size: 9.5pt;
      color: #475569;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .heading-divider {
      height: 1px;
      background-color: #0F172A;
      margin-bottom: 6px;
    }
    .body-text {
      font-size: 9.5pt;
      line-height: 1.45;
      color: #1E293B;
    }
    .skills-row {
      margin-bottom: 3px;
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.4;
    }
    .skill-cat {
      font-weight: 700;
      color: #0F172A;
    }
    .item-block {
      margin-bottom: 8px;
    }
    .item-top-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .item-primary-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0F172A;
      flex: 1;
    }
    .item-date {
      font-size: 9pt;
      color: #64748B;
      font-weight: 500;
      white-space: nowrap;
    }
    .item-sub-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1px;
      margin-bottom: 2px;
    }
    .item-company {
      font-size: 9.5pt;
      font-style: italic;
      color: #334155;
    }
    .item-location {
      font-size: 9pt;
      color: #64748B;
    }
    .proj-domain {
      font-size: 9pt;
      font-style: italic;
      color: #475569;
      font-weight: normal;
      margin-left: 4px;
    }
    .bullet-list {
      margin-top: 2px;
    }
    .bullet-row {
      display: flex;
      align-items: flex-start;
      margin-top: 2px;
      gap: 6px;
    }
    .bullet-dot {
      font-size: 10pt;
      line-height: 1.35;
      color: #0F172A;
    }
    .bullet-text {
      font-size: 9pt;
      line-height: 1.35;
      color: #1E293B;
      flex: 1;
    }
    .tech-text {
      font-size: 9pt;
      color: #475569;
      margin-top: 3px;
    }
    .cert-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .cert-name {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0F172A;
    }
    .cert-issuer {
      font-size: 9pt;
      color: #64748B;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="name">${escapeHtml(p.fullName || 'Candidate Name')}</div>
    ${contactItems.length > 0 ? `<div class="contacts">${contactItems.join(' &nbsp;&bull;&nbsp; ')}</div>` : ''}
  </div>

  <!-- SUMMARY -->
  ${
    resume.summary && resume.summary.trim().length > 0
      ? `
  <div class="section">
    <div class="section-title">Summary</div>
    <div class="heading-divider"></div>
    <div class="body-text">${escapeHtml(resume.summary)}</div>
  </div>`
      : ''
  }

  <!-- TECHNICAL SKILLS -->
  ${
    Object.keys(skillsByCategory).length > 0
      ? `
  <div class="section">
    <div class="section-title">Technical Skills</div>
    <div class="heading-divider"></div>
    ${Object.entries(skillsByCategory)
      .map(
        ([category, skillNames]) => `
      <div class="skills-row">
        <span class="skill-cat">${escapeHtml(category)}: </span>
        <span>${escapeHtml(skillNames.join(', '))}</span>
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
    <div class="heading-divider"></div>
    ${resume.experience
      .map(
        (exp) => `
    <div class="item-block">
      <div class="item-top-row">
        <span class="item-primary-title">${escapeHtml(exp.jobTitle)}</span>
        <span class="item-date">${escapeHtml([exp.startDate, exp.endDate].filter(Boolean).join(' – '))}</span>
      </div>
      <div class="item-sub-row">
        <span class="item-company">${escapeHtml(exp.company)}</span>
        ${exp.location ? `<span class="item-location">${escapeHtml(exp.location)}</span>` : ''}
      </div>
      ${
        exp.description
          ? `<div class="bullet-list">${exp.description
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map(
                (line) => `
            <div class="bullet-row">
              <span class="bullet-dot">&bull;</span>
              <span class="bullet-text">${escapeHtml(line.trim())}</span>
            </div>`
              )
              .join('')}</div>`
          : ''
      }
      ${
        exp.technologies
          ? `<div class="tech-text"><strong>Technologies: </strong>${escapeHtml(exp.technologies)}</div>`
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
    <div class="heading-divider"></div>
    ${resume.projects
      .map(
        (proj) => `
    <div class="item-block">
      <div class="item-top-row">
        <span class="item-primary-title">${escapeHtml(proj.projectName)}${proj.projectTypeOrDomain ? `<span class="proj-domain">| ${escapeHtml(proj.projectTypeOrDomain)}</span>` : ''}</span>
      </div>
      ${proj.description ? `<div class="body-text">${escapeHtml(proj.description)}</div>` : ''}
      ${
        proj.featuresOrWorkDone
          ? `
      <div class="bullet-row">
        <span class="bullet-dot">&bull;</span>
        <span class="bullet-text">${escapeHtml(proj.featuresOrWorkDone)}</span>
      </div>`
          : ''
      }
      ${
        proj.myContribution
          ? `
      <div class="bullet-row">
        <span class="bullet-dot">&bull;</span>
        <span class="bullet-text">${escapeHtml(proj.myContribution)}</span>
      </div>`
          : ''
      }
      ${
        proj.technologies
          ? `<div class="tech-text"><strong>Technologies: </strong>${escapeHtml(proj.technologies)}</div>`
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
    <div class="heading-divider"></div>
    ${resume.education
      .map(
        (edu) => `
    <div class="item-block">
      <div class="item-top-row">
        <span class="item-primary-title">${escapeHtml(edu.institution)}</span>
        <span class="item-date">${escapeHtml([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</span>
      </div>
      <div class="item-sub-row">
        <span class="item-company">${escapeHtml(edu.degree)}</span>
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
    <div class="heading-divider"></div>
    ${resume.certifications
      .map(
        (cert) => `
    <div class="cert-row">
      <span class="cert-name">${escapeHtml(cert.name)}</span>
      <span class="cert-issuer">${escapeHtml(cert.issuingOrganization)}${cert.issueDate ? ` (${escapeHtml(cert.issueDate)})` : ''}</span>
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
    try {
      const html = generateResumeHtml(resume);

      // Render PDF on-device using native OS engine with base64 enabled
      const printResult = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
        base64: true,
      });

      const dir = `${FileSystem.documentDirectory}hireFlow/resumes/`;
      const safeCompany = (companyOrJobId || 'hireFlow').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetFilePath = `${dir}${safeCompany}_v${versionNumber}.pdf`;

      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      // Write PDF directly to hireFlow storage using base64 (avoids scoped storage cache copy errors on Android)
      if (printResult.base64) {
        await FileSystem.writeAsStringAsync(targetFilePath, printResult.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileInfo = await FileSystem.getInfoAsync(targetFilePath);

        return {
          pdfPath: targetFilePath,
          sizeBytes: (fileInfo as any).size || Math.round(printResult.base64.length * 0.75),
        };
      }

      // Fallback: try copyAsync, or use printResult.uri directly
      try {
        await FileSystem.copyAsync({
          from: printResult.uri,
          to: targetFilePath,
        });

        const fileInfo = await FileSystem.getInfoAsync(targetFilePath);
        return {
          pdfPath: targetFilePath,
          sizeBytes: (fileInfo as any).size || 25000,
        };
      } catch (copyErr) {
        console.warn('copyAsync fallback to direct print URI:', copyErr);
        return {
          pdfPath: printResult.uri,
          sizeBytes: 25000,
        };
      }
    } catch (err: any) {
      await errorLogger.logError('localPdfGenerator.generatePdfFromResume', err, {
        companyOrJobId,
        versionNumber,
      });
      throw err;
    }
  },
};
