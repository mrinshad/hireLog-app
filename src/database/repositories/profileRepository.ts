import { getDatabase } from '../database';
import {
  Certification,
  Education,
  Experience,
  INITIAL_PROFILE,
  PersonalDetails,
  ProfessionalInfo,
  Profile,
  Project,
  Skill,
  SkillCategory,
} from '@/types/profile';

interface ProfileDetailsRow {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  professional_title: string;
  professional_summary: string;
}

interface SkillRow {
  id: string;
  name: string;
  category: string;
}

interface ExperienceRow {
  id: string;
  company: string;
  job_title: string;
  location: string;
  start_date: string;
  end_date: string;
  currently_working: number;
  description: string;
  technologies: string;
}

interface ProjectRow {
  id: string;
  project_name: string;
  description: string;
  project_type_or_domain: string;
  technologies: string;
  features_or_work_done: string;
  my_contribution: string;
}

interface EducationRow {
  id: string;
  degree: string;
  institution: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface CertificationRow {
  id: string;
  name: string;
  issuing_organization: string;
  issue_date: string;
  credential_id: string;
  credential_url: string;
}

export const profileRepository = {
  /**
   * Loads the complete profile from SQLite.
   */
  async getProfile(): Promise<Profile> {
    const db = await getDatabase();

    // 1. Load Profile Details (single-user row id = 1)
    const detailsRow = await db.getFirstAsync<ProfileDetailsRow>(
      'SELECT full_name, email, phone, location, linkedin, github, portfolio, professional_title, professional_summary FROM profile_details WHERE id = 1;'
    );

    const personalDetails: PersonalDetails = {
      fullName: detailsRow?.full_name ?? '',
      email: detailsRow?.email ?? '',
      phone: detailsRow?.phone ?? '',
      location: detailsRow?.location ?? '',
      linkedIn: detailsRow?.linkedin ?? '',
      github: detailsRow?.github ?? '',
      portfolio: detailsRow?.portfolio ?? '',
    };

    const professionalInfo: ProfessionalInfo = {
      professionalTitle: detailsRow?.professional_title ?? '',
      professionalSummary: detailsRow?.professional_summary ?? '',
    };

    // 2. Load Skills
    const skillRows = await db.getAllAsync<SkillRow>(
      'SELECT id, name, category FROM skills ORDER BY created_at ASC;'
    );
    const skills: Skill[] = skillRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as SkillCategory,
    }));

    // 3. Load Experiences
    const expRows = await db.getAllAsync<ExperienceRow>(
      'SELECT id, company, job_title, location, start_date, end_date, currently_working, description, technologies FROM experiences ORDER BY created_at DESC;'
    );
    const experience: Experience[] = expRows.map((r) => ({
      id: r.id,
      company: r.company,
      jobTitle: r.job_title,
      location: r.location,
      startDate: r.start_date,
      endDate: r.end_date,
      currentlyWorking: r.currently_working === 1,
      description: r.description,
      technologies: r.technologies,
    }));

    // 4. Load Projects
    const projRows = await db.getAllAsync<ProjectRow>(
      'SELECT id, project_name, description, project_type_or_domain, technologies, features_or_work_done, my_contribution FROM projects ORDER BY created_at DESC;'
    );
    const projects: Project[] = projRows.map((r) => ({
      id: r.id,
      projectName: r.project_name,
      description: r.description,
      projectTypeOrDomain: r.project_type_or_domain,
      technologies: r.technologies,
      featuresOrWorkDone: r.features_or_work_done,
      myContribution: r.my_contribution,
    }));

    // 5. Load Education
    const eduRows = await db.getAllAsync<EducationRow>(
      'SELECT id, degree, institution, location, start_date, end_date, description FROM education ORDER BY created_at DESC;'
    );
    const education: Education[] = eduRows.map((r) => ({
      id: r.id,
      degree: r.degree,
      institution: r.institution,
      location: r.location,
      startDate: r.start_date,
      endDate: r.end_date,
      description: r.description,
    }));

    // 6. Load Certifications
    const certRows = await db.getAllAsync<CertificationRow>(
      'SELECT id, name, issuing_organization, issue_date, credential_id, credential_url FROM certifications ORDER BY created_at DESC;'
    );
    const certifications: Certification[] = certRows.map((r) => ({
      id: r.id,
      name: r.name,
      issuingOrganization: r.issuing_organization,
      issueDate: r.issue_date,
      credentialId: r.credential_id,
      credentialUrl: r.credential_url,
    }));

    return {
      personalDetails,
      professionalInfo,
      skills,
      experience,
      projects,
      education,
      certifications,
    };
  },

  /**
   * Persists Personal Details to SQLite.
   */
  async savePersonalDetails(details: PersonalDetails): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO profile_details (id, full_name, email, phone, location, linkedin, github, portfolio, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         full_name = excluded.full_name,
         email = excluded.email,
         phone = excluded.phone,
         location = excluded.location,
         linkedin = excluded.linkedin,
         github = excluded.github,
         portfolio = excluded.portfolio,
         updated_at = datetime('now');`,
      details.fullName,
      details.email,
      details.phone,
      details.location,
      details.linkedIn || '',
      details.github || '',
      details.portfolio || ''
    );
  },

  /**
   * Persists Professional Information to SQLite.
   */
  async saveProfessionalInfo(info: ProfessionalInfo): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO profile_details (id, professional_title, professional_summary, updated_at)
       VALUES (1, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         professional_title = excluded.professional_title,
         professional_summary = excluded.professional_summary,
         updated_at = datetime('now');`,
      info.professionalTitle,
      info.professionalSummary
    );
  },

  /**
   * Syncs the complete skills array with SQLite.
   */
  async saveSkills(skills: Skill[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM skills;');
      for (const skill of skills) {
        await db.runAsync(
          'INSERT INTO skills (id, name, category) VALUES (?, ?, ?);',
          skill.id,
          skill.name,
          skill.category
        );
      }
    });
  },

  /**
   * Syncs the complete experiences array with SQLite.
   */
  async saveExperiences(experiences: Experience[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM experiences;');
      for (const exp of experiences) {
        await db.runAsync(
          `INSERT INTO experiences (id, company, job_title, location, start_date, end_date, currently_working, description, technologies)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          exp.id,
          exp.company,
          exp.jobTitle,
          exp.location,
          exp.startDate,
          exp.endDate,
          exp.currentlyWorking ? 1 : 0,
          exp.description,
          exp.technologies
        );
      }
    });
  },

  /**
   * Syncs the complete projects array with SQLite.
   */
  async saveProjects(projects: Project[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM projects;');
      for (const proj of projects) {
        await db.runAsync(
          `INSERT INTO projects (id, project_name, description, project_type_or_domain, technologies, features_or_work_done, my_contribution)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          proj.id,
          proj.projectName,
          proj.description,
          proj.projectTypeOrDomain,
          proj.technologies,
          proj.featuresOrWorkDone,
          proj.myContribution
        );
      }
    });
  },

  /**
   * Syncs the complete education array with SQLite.
   */
  async saveEducation(educationList: Education[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM education;');
      for (const edu of educationList) {
        await db.runAsync(
          `INSERT INTO education (id, degree, institution, location, start_date, end_date, description)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          edu.id,
          edu.degree,
          edu.institution,
          edu.location,
          edu.startDate,
          edu.endDate,
          edu.description || ''
        );
      }
    });
  },

  /**
   * Syncs the complete certifications array with SQLite.
   */
  async saveCertifications(certifications: Certification[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM certifications;');
      for (const cert of certifications) {
        await db.runAsync(
          `INSERT INTO certifications (id, name, issuing_organization, issue_date, credential_id, credential_url)
           VALUES (?, ?, ?, ?, ?, ?);`,
          cert.id,
          cert.name,
          cert.issuingOrganization,
          cert.issueDate,
          cert.credentialId || '',
          cert.credentialUrl || ''
        );
      }
    });
  },
};
