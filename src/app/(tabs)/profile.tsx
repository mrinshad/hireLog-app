import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { CertificationsModal } from '@/components/profile/CertificationsModal';
import { EducationModal } from '@/components/profile/EducationModal';
import { ExperienceModal } from '@/components/profile/ExperienceModal';
import { PersonalDetailsModal } from '@/components/profile/PersonalDetailsModal';
import { ProfessionalInfoModal } from '@/components/profile/ProfessionalInfoModal';
import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';
import { ProjectsModal } from '@/components/profile/ProjectsModal';
import { SkillsModal } from '@/components/profile/SkillsModal';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog, AppToast } from '@/context/DialogContext';
import { profileRepository } from '@/database/repositories/profileRepository';
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
} from '@/types/profile';

type ActiveModal =
  | 'personal'
  | 'professional'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications'
  | null;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  useEffect(() => {
    async function loadSavedProfile() {
      try {
        const saved = await profileRepository.getProfile();
        setProfile(saved);
      } catch (error) {
        console.error('Failed to load profile:', error);
        AppDialog.error('Profile Error', 'Failed to load profile information.');
      } finally {
        setIsLoading(false);
      }
    }
    loadSavedProfile();
  }, []);

  const handleSavePersonal = async (data: PersonalDetails) => {
    try {
      await profileRepository.savePersonalDetails(data);
      setProfile((prev) => ({ ...prev, personalDetails: data }));
      AppToast.show('Personal details saved', 'success');
    } catch (error) {
      console.error('Failed to save personal details:', error);
      AppDialog.error('Save Failed', 'Failed to save personal details.');
    }
  };

  const handleSaveProfessional = async (data: ProfessionalInfo) => {
    try {
      await profileRepository.saveProfessionalInfo(data);
      setProfile((prev) => ({ ...prev, professionalInfo: data }));
      AppToast.show('Professional info saved', 'success');
    } catch (error) {
      console.error('Failed to save professional info:', error);
      AppDialog.error('Save Failed', 'Failed to save professional info.');
    }
  };

  const handleSaveSkills = async (skills: Skill[]) => {
    try {
      await profileRepository.saveSkills(skills);
      setProfile((prev) => ({ ...prev, skills }));
      AppToast.show('Skills updated', 'success');
    } catch (error) {
      console.error('Failed to save skills:', error);
      AppDialog.error('Save Failed', 'Failed to save skills.');
    }
  };

  const handleSaveExperience = async (experience: Experience[]) => {
    try {
      await profileRepository.saveExperiences(experience);
      setProfile((prev) => ({ ...prev, experience }));
      AppToast.show('Experience saved', 'success');
    } catch (error) {
      console.error('Failed to save experience:', error);
      AppDialog.error('Save Failed', 'Failed to save experience.');
    }
  };

  const handleSaveProjects = async (projects: Project[]) => {
    try {
      await profileRepository.saveProjects(projects);
      setProfile((prev) => ({ ...prev, projects }));
      AppToast.show('Projects saved', 'success');
    } catch (error) {
      console.error('Failed to save projects:', error);
      AppDialog.error('Save Failed', 'Failed to save projects.');
    }
  };

  const handleSaveEducation = async (education: Education[]) => {
    try {
      await profileRepository.saveEducation(education);
      setProfile((prev) => ({ ...prev, education }));
      AppToast.show('Education saved', 'success');
    } catch (error) {
      console.error('Failed to save education:', error);
      AppDialog.error('Save Failed', 'Failed to save education.');
    }
  };

  const handleSaveCertifications = async (certifications: Certification[]) => {
    try {
      await profileRepository.saveCertifications(certifications);
      setProfile((prev) => ({ ...prev, certifications }));
      AppToast.show('Certifications saved', 'success');
    } catch (error) {
      console.error('Failed to save certifications:', error);
      AppDialog.error('Save Failed', 'Failed to save certifications.');
    }
  };

  const getPersonalSummary = () => {
    const { fullName, location, email } = profile.personalDetails;
    if (!fullName) return 'Name, email, phone & links';
    const parts = [fullName];
    if (location) parts.push(location);
    else if (email) parts.push(email);
    return parts.join(' • ');
  };

  const getProfessionalSummary = () => {
    const { professionalTitle, professionalSummary } = profile.professionalInfo;
    if (!professionalTitle && !professionalSummary) return 'Title & career summary';
    if (professionalTitle && professionalSummary) {
      return `${professionalTitle} — ${professionalSummary}`;
    }
    return professionalTitle || professionalSummary;
  };

  const getSkillsSummary = () => {
    if (profile.skills.length === 0) return 'Technical & domain skills';
    const sample = profile.skills
      .slice(0, 4)
      .map((s) => s.name)
      .join(', ');
    return profile.skills.length > 4 ? `${sample}...` : sample;
  };

  const getExperienceSummary = () => {
    if (profile.experience.length === 0) return 'Employment history & accomplishments';
    const latest = profile.experience[0];
    return `${latest.jobTitle} at ${latest.company}`;
  };

  const getProjectsSummary = () => {
    if (profile.projects.length === 0) return 'Highlighted projects & contributions';
    const sample = profile.projects
      .slice(0, 2)
      .map((p) => p.projectName)
      .join(', ');
    return profile.projects.length > 2 ? `${sample}...` : sample;
  };

  const getEducationSummary = () => {
    if (profile.education.length === 0) return 'Degrees & institutions';
    const latest = profile.education[0];
    return `${latest.degree}${latest.institution ? ` • ${latest.institution}` : ''}`;
  };

  const getCertificationsSummary = () => {
    if (profile.certifications.length === 0) return 'Certifications & credentials';
    const sample = profile.certifications
      .slice(0, 2)
      .map((c) => c.name)
      .join(', ');
    return profile.certifications.length > 2 ? `${sample}...` : sample;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Profile" subtitle="Verified Source of Truth" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Notice banner */}
        <View style={styles.sourceOfTruthBanner}>
          <Feather name="shield" size={IconSizes.sm} color={Colors.primaryDark} />
          <Text style={styles.bannerText}>
            Resumes are strictly tailored from this verified profile.
          </Text>
        </View>

        {/* 1. Personal Details */}
        <ProfileSectionCard
          title="Personal Details"
          icon="user"
          summary={getPersonalSummary()}
          onEdit={() => setActiveModal('personal')}
          actionLabel={profile.personalDetails.fullName ? 'Edit' : 'Add'}
        />

        {/* 2. Professional Information */}
        <ProfileSectionCard
          title="Professional Info"
          icon="briefcase"
          summary={getProfessionalSummary()}
          onEdit={() => setActiveModal('professional')}
          actionLabel={profile.professionalInfo.professionalTitle ? 'Edit' : 'Add'}
        />

        {/* 3. Skills */}
        <ProfileSectionCard
          title="Skills"
          icon="cpu"
          itemCount={profile.skills.length}
          summary={getSkillsSummary()}
          onEdit={() => setActiveModal('skills')}
          actionLabel={profile.skills.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 4. Work Experience */}
        <ProfileSectionCard
          title="Work Experience"
          icon="calendar"
          itemCount={profile.experience.length}
          summary={getExperienceSummary()}
          onEdit={() => setActiveModal('experience')}
          actionLabel={profile.experience.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 5. Projects */}
        <ProfileSectionCard
          title="Projects"
          icon="folder"
          itemCount={profile.projects.length}
          summary={getProjectsSummary()}
          onEdit={() => setActiveModal('projects')}
          actionLabel={profile.projects.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 6. Education */}
        <ProfileSectionCard
          title="Education"
          icon="book"
          itemCount={profile.education.length}
          summary={getEducationSummary()}
          onEdit={() => setActiveModal('education')}
          actionLabel={profile.education.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 7. Certifications */}
        <ProfileSectionCard
          title="Certifications"
          icon="award"
          itemCount={profile.certifications.length}
          summary={getCertificationsSummary()}
          onEdit={() => setActiveModal('certifications')}
          actionLabel={profile.certifications.length > 0 ? 'Manage' : 'Add'}
        />
      </ScrollView>

      {/* Modals */}
      <PersonalDetailsModal
        visible={activeModal === 'personal'}
        initialData={profile.personalDetails}
        onClose={() => setActiveModal(null)}
        onSave={handleSavePersonal}
      />

      <ProfessionalInfoModal
        visible={activeModal === 'professional'}
        initialData={profile.professionalInfo}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveProfessional}
      />

      <SkillsModal
        visible={activeModal === 'skills'}
        skills={profile.skills}
        onClose={() => setActiveModal(null)}
        onSaveSkills={handleSaveSkills}
      />

      <ExperienceModal
        visible={activeModal === 'experience'}
        experiences={profile.experience}
        onClose={() => setActiveModal(null)}
        onSaveExperiences={handleSaveExperience}
      />

      <ProjectsModal
        visible={activeModal === 'projects'}
        projects={profile.projects}
        onClose={() => setActiveModal(null)}
        onSaveProjects={handleSaveProjects}
      />

      <EducationModal
        visible={activeModal === 'education'}
        educationList={profile.education}
        onClose={() => setActiveModal(null)}
        onSaveEducation={handleSaveEducation}
      />

      <CertificationsModal
        visible={activeModal === 'certifications'}
        certifications={profile.certifications}
        onClose={() => setActiveModal(null)}
        onSaveCertifications={handleSaveCertifications}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  sourceOfTruthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '500',
    lineHeight: 16,
  },
});
