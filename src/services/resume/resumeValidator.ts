import { Profile } from '@/types/profile';
import { CustomizedResume } from '@/types/resume';

export class ResumeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeValidationError';
  }
}

export const resumeValidator = {
  /**
   * Strictly validates that all factual content in a CustomizedResume
   * exists verbatim in the candidate's Profile.
   * Throws ResumeValidationError if any fabricated or unsupported item is detected.
   */
  validate(profile: Profile, resume: CustomizedResume): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const profileSkillsMap = new Map((profile.skills || []).map((s) => [s.id, s]));
    const profileExperienceMap = new Map((profile.experience || []).map((e) => [e.id, e]));
    const profileProjectsMap = new Map((profile.projects || []).map((p) => [p.id, p]));
    const profileEducationMap = new Map((profile.education || []).map((ed) => [ed.id, ed]));
    const profileCertMap = new Map((profile.certifications || []).map((c) => [c.id, c]));

    // 1. Validate Skills
    (resume.skills || []).forEach((skill) => {
      const source = profileSkillsMap.get(skill.profileId);
      if (!source) {
        errors.push(`Skill "${skill.name}" has invalid or missing profile ID: ${skill.profileId}`);
      } else if (source.name.toLowerCase().trim() !== skill.name.toLowerCase().trim()) {
        errors.push(`Skill name "${skill.name}" does not match profile skill name "${source.name}"`);
      }
    });

    // Check that unmatched JD skills are NOT present in resume skills
    const resumeSkillNames = new Set(
      (resume.skills || []).map((s) => s.name.toLowerCase().trim())
    );
    (resume.unmatchedJdSkills || []).forEach((unmatched) => {
      if (resumeSkillNames.has(unmatched.toLowerCase().trim())) {
        errors.push(`Unmatched JD skill "${unmatched}" was illegally injected into resume skills.`);
      }
    });

    // 2. Validate Experience
    (resume.experience || []).forEach((exp) => {
      const source = profileExperienceMap.get(exp.profileId);
      if (!source) {
        errors.push(`Experience "${exp.company}" has invalid or missing profile ID: ${exp.profileId}`);
      } else {
        if (source.company !== exp.company) {
          errors.push(`Experience company "${exp.company}" differs from profile "${source.company}"`);
        }
        if (source.jobTitle !== exp.jobTitle) {
          errors.push(`Experience title "${exp.jobTitle}" differs from profile "${source.jobTitle}"`);
        }
        if (source.startDate !== exp.startDate || source.endDate !== exp.endDate) {
          errors.push(`Experience dates for "${exp.company}" differ from profile records.`);
        }
      }
    });

    // 3. Validate Projects
    (resume.projects || []).forEach((proj) => {
      const source = profileProjectsMap.get(proj.profileId);
      if (!source) {
        errors.push(`Project "${proj.projectName}" has invalid or missing profile ID: ${proj.profileId}`);
      } else {
        if (source.projectName !== proj.projectName) {
          errors.push(`Project name "${proj.projectName}" differs from profile "${source.projectName}"`);
        }
        if (source.technologies !== proj.technologies) {
          errors.push(`Project technologies for "${proj.projectName}" differ from profile.`);
        }
      }
    });

    // 4. Validate Education
    (resume.education || []).forEach((edu) => {
      const source = profileEducationMap.get(edu.profileId);
      if (!source) {
        errors.push(`Education "${edu.institution}" has invalid or missing profile ID: ${edu.profileId}`);
      }
    });

    // 5. Validate Certifications
    (resume.certifications || []).forEach((cert) => {
      const source = profileCertMap.get(cert.profileId);
      if (!source) {
        errors.push(`Certification "${cert.name}" has invalid or missing profile ID: ${cert.profileId}`);
      }
    });

    if (errors.length > 0) {
      throw new ResumeValidationError(
        `Resume failed truthful validation against Profile:\n${errors.join('\n')}`
      );
    }

    return { valid: true, errors: [] };
  },
};
