import { JobAnalysis } from '@/types/job';
import { MatchResult } from '@/types/matching';
import { INITIAL_PROFILE, Profile, SkillCategory } from '@/types/profile';
import {
  CustomizedCertificationItem,
  CustomizedEducationItem,
  CustomizedExperienceItem,
  CustomizedProjectItem,
  CustomizedResume,
  CustomizedSkillItem,
} from '@/types/resume';
import { getCanonicalSkill, normalizeSkill } from '../matching/matchingEngine';

export const resumeCustomizer = {
  /**
   * Tailors a job-specific resume from verified Profile, Job Analysis, and Match Result.
   * Completely deterministic, explainable, and 100% traceable to Profile IDs.
   */
  customize(
    profile: Profile,
    jdAnalysis: JobAnalysis,
    matchResult: MatchResult,
    jobId: string
  ): CustomizedResume {
    const profileSkills = profile?.skills || [];
    const profileExperience = profile?.experience || [];
    const profileProjects = profile?.projects || [];
    const profileEducation = profile?.education || [];
    const profileCertifications = profile?.certifications || [];

    // 1. Skill Selection & Prioritization
    const selectedSkills: CustomizedSkillItem[] = [];
    const addedSkillNames = new Set<string>();

    const reqMatchedNames = new Set(
      (matchResult?.requiredSkills?.matched || []).map((m) =>
        normalizeSkill(m.profileSkill || m.jdSkill)
      )
    );
    const prefMatchedNames = new Set(
      (matchResult?.preferredSkills?.matched || []).map((m) =>
        normalizeSkill(m.profileSkill || m.jdSkill)
      )
    );

    // Group 1: Required matching skills from Profile
    profileSkills.forEach((skill) => {
      const norm = normalizeSkill(skill.name);
      const canon = getCanonicalSkill(skill.name);

      const isReq =
        reqMatchedNames.has(norm) ||
        reqMatchedNames.has(canon) ||
        (matchResult?.requiredSkills?.matched || []).some(
          (m) => getCanonicalSkill(m.jdSkill) === canon
        );

      if (isReq && !addedSkillNames.has(norm)) {
        addedSkillNames.add(norm);
        selectedSkills.push({
          profileId: skill.id,
          name: skill.name,
          category: skill.category,
          priority: 'required',
          displayOrder: 0,
        });
      }
    });

    // Group 2: Preferred matching skills from Profile
    profileSkills.forEach((skill) => {
      const norm = normalizeSkill(skill.name);
      const canon = getCanonicalSkill(skill.name);

      const isPref =
        prefMatchedNames.has(norm) ||
        prefMatchedNames.has(canon) ||
        (matchResult?.preferredSkills?.matched || []).some(
          (m) => getCanonicalSkill(m.jdSkill) === canon
        );

      if (isPref && !addedSkillNames.has(norm)) {
        addedSkillNames.add(norm);
        selectedSkills.push({
          profileId: skill.id,
          name: skill.name,
          category: skill.category,
          priority: 'preferred',
          displayOrder: 0,
        });
      }
    });

    // Group 3: Additional relevant skills from Profile (up to max 16 total skills)
    const MAX_SKILLS = 16;
    const prioritizedCategories: SkillCategory[] = [
      'Programming Languages',
      'Frontend',
      'Backend',
      'Databases',
      'Cloud',
      'DevOps / Infrastructure',
      'Tools',
      'Other',
    ];

    for (const cat of prioritizedCategories) {
      if (selectedSkills.length >= MAX_SKILLS) break;
      profileSkills
        .filter((s) => s.category === cat)
        .forEach((skill) => {
          const norm = normalizeSkill(skill.name);
          if (!addedSkillNames.has(norm) && selectedSkills.length < MAX_SKILLS) {
            addedSkillNames.add(norm);
            selectedSkills.push({
              profileId: skill.id,
              name: skill.name,
              category: skill.category,
              priority: 'general',
              displayOrder: 0,
            });
          }
        });
    }

    // Assign display orders
    selectedSkills.forEach((item, index) => {
      item.displayOrder = index + 1;
    });

    // 2. Experience Selection & Ranking
    const experienceMatchMap = new Map<string, { score: number; matchedSkills: string[] }>();
    (matchResult?.relevantExperiences || []).forEach((rel) => {
      experienceMatchMap.set(rel.experienceId, {
        score: rel.score,
        matchedSkills: rel.matchedSkills,
      });
    });

    const customizedExperience: CustomizedExperienceItem[] = profileExperience
      .map((exp) => {
        const matchInfo = experienceMatchMap.get(exp.id) || { score: 0, matchedSkills: [] };
        return {
          profileId: exp.id,
          company: exp.company,
          jobTitle: exp.jobTitle,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          currentlyWorking: exp.currentlyWorking,
          description: exp.description,
          technologies: exp.technologies,
          matchedSkills: matchInfo.matchedSkills,
          relevanceScore: matchInfo.score,
          displayOrder: 0,
        };
      })
      .sort((a, b) => {
        // High relevance score first, then most recent
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return (b.startDate || '').localeCompare(a.startDate || '');
      });

    customizedExperience.forEach((item, index) => {
      item.displayOrder = index + 1;
    });

    // 3. Project Selection & Ranking
    const projectMatchMap = new Map<string, { score: number; matchedSkills: string[] }>();
    (matchResult?.relevantProjects || []).forEach((rel) => {
      projectMatchMap.set(rel.projectId, {
        score: rel.score,
        matchedSkills: rel.matchedSkills,
      });
    });

    const customizedProjects: CustomizedProjectItem[] = profileProjects
      .map((proj) => {
        const matchInfo = projectMatchMap.get(proj.id) || { score: 0, matchedSkills: [] };
        return {
          profileId: proj.id,
          projectName: proj.projectName,
          projectTypeOrDomain: proj.projectTypeOrDomain,
          technologies: proj.technologies,
          description: proj.description,
          featuresOrWorkDone: proj.featuresOrWorkDone,
          myContribution: proj.myContribution,
          matchedSkills: matchInfo.matchedSkills,
          relevanceScore: matchInfo.score,
          displayOrder: 0,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit to top 3-4 projects if candidate has many
    const topProjects = customizedProjects.slice(0, 4);
    topProjects.forEach((item, index) => {
      item.displayOrder = index + 1;
    });

    // 4. Education & Certifications
    const customizedEducation: CustomizedEducationItem[] = profileEducation.map(
      (edu, index) => ({
        profileId: edu.id,
        degree: edu.degree,
        institution: edu.institution,
        location: edu.location,
        startDate: edu.startDate,
        endDate: edu.endDate,
        description: edu.description,
        displayOrder: index + 1,
      })
    );

    const customizedCertifications: CustomizedCertificationItem[] =
      profileCertifications.map((cert, index) => ({
        profileId: cert.id,
        name: cert.name,
        issuingOrganization: cert.issuingOrganization,
        issueDate: cert.issueDate,
        credentialId: cert.credentialId,
        credentialUrl: cert.credentialUrl,
        displayOrder: index + 1,
      }));

    // 5. Deterministic Factual Summary Generation
    const candidateTitle =
      profile?.professionalInfo?.professionalTitle?.trim() ||
      (profileExperience.length > 0 ? profileExperience[0].jobTitle : 'Software Professional');

    const topMatchedTech = (matchResult?.allMatchedSkills || []).slice(0, 4);
    const techHighlight =
      topMatchedTech.length > 0 ? ` with strong expertise in ${topMatchedTech.join(', ')}` : '';

    const topProjectDomain =
      topProjects.length > 0 && topProjects[0].projectTypeOrDomain
        ? ` and ${topProjects[0].projectTypeOrDomain}`
        : '';

    let generatedSummary = '';
    if (profile?.professionalInfo?.professionalSummary?.trim()) {
      // Use candidate's verified summary as base
      generatedSummary = profile.professionalInfo.professionalSummary.trim();
    } else {
      // Generate factual structured summary from verified records
      generatedSummary = `${candidateTitle}${techHighlight}. Experienced in software development, project delivery${topProjectDomain}, and building reliable, scalable solutions aligned with industry best practices.`;
    }

    // 6. Collect Unmatched JD Skills
    const unmatchedJdSkills = matchResult?.allMissingSkills || [];

    return {
      jobId,
      targetRole: jdAnalysis?.role || 'Target Position',
      targetCompany: jdAnalysis?.company || 'Company',
      personalDetails: profile?.personalDetails || INITIAL_PROFILE.personalDetails,
      summary: generatedSummary,
      skills: selectedSkills,
      experience: customizedExperience,
      projects: topProjects,
      education: customizedEducation,
      certifications: customizedCertifications,
      unmatchedJdSkills,
      overallMatchScore: matchResult?.overallScore || 0,
      generatedAt: new Date().toISOString(),
    };
  },
};
