import { CustomizedResume } from '@/types/resume';
import {
  renderCertifications,
  renderEducation,
  renderExperience,
  renderHeader,
  renderPreamble,
  renderProjects,
  renderSkills,
  renderSummary,
} from './template';
import { DEFAULT_TEMPLATE_CONFIG, ResumeSectionId, TemplateConfig } from './types';

export const latexRenderer = {
  /**
   * Renders a CustomizedResume into a complete, compilable LaTeX document string.
   */
  render(
    resume: CustomizedResume,
    customConfig: Partial<TemplateConfig> = {}
  ): string {
    const config: TemplateConfig = {
      ...DEFAULT_TEMPLATE_CONFIG,
      ...customConfig,
    };

    const preamble = renderPreamble(config);
    const header = renderHeader(resume, config);

    const sectionRenderers: Record<ResumeSectionId, () => string> = {
      summary: () => (config.showSummary ? renderSummary(resume) : ''),
      skills: () => (config.showSkills ? renderSkills(resume) : ''),
      experience: () =>
        config.showExperience ? renderExperience(resume, config) : '',
      projects: () => (config.showProjects ? renderProjects(resume, config) : ''),
      education: () => (config.showEducation ? renderEducation(resume) : ''),
      certifications: () =>
        config.showCertifications ? renderCertifications(resume) : '',
    };

    const renderedSections = config.sectionOrder
      .map((sectionId) => {
        const renderFn = sectionRenderers[sectionId];
        return renderFn ? renderFn() : '';
      })
      .filter((content) => content.trim().length > 0);

    return `${preamble}

\\begin{document}

${header}
${renderedSections.join('\n')}
\\end{document}
`;
  },
};
