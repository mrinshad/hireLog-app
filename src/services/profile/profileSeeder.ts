import { OWNER_PROFILE } from '@/data/ownerProfileData';
import { profileRepository } from '@/database/repositories/profileRepository';

const SEED_GATE_PIN = '9895';

export const profileSeeder = {
  /**
   * Validates the accidental-action gate password.
   */
  verifyPassword(password: string): boolean {
    return password.trim() === SEED_GATE_PIN;
  },

  /**
   * Seeds the database with the owner's predefined profile information.
   * Atomic, idempotent, and requires zero AI/network calls.
   */
  async seedOwnerProfile(): Promise<void> {
    await Promise.all([
      profileRepository.savePersonalDetails(OWNER_PROFILE.personalDetails),
      profileRepository.saveProfessionalInfo(OWNER_PROFILE.professionalInfo),
    ]);

    await profileRepository.saveSkills(OWNER_PROFILE.skills);
    await profileRepository.saveExperiences(OWNER_PROFILE.experience);
    await profileRepository.saveProjects(OWNER_PROFILE.projects);
    await profileRepository.saveEducation(OWNER_PROFILE.education);
    await profileRepository.saveCertifications(OWNER_PROFILE.certifications);
  },
};
