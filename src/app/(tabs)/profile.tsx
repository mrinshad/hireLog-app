import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CertificationsModal } from '@/components/profile/CertificationsModal';
import { EducationModal } from '@/components/profile/EducationModal';
import { ExperienceModal } from '@/components/profile/ExperienceModal';
import { PersonalDetailsModal } from '@/components/profile/PersonalDetailsModal';
import { ProfessionalInfoModal } from '@/components/profile/ProfessionalInfoModal';
import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';
import { ProjectsModal } from '@/components/profile/ProjectsModal';
import { SkillsModal } from '@/components/profile/SkillsModal';
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
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Summary formatters
  const getPersonalSummary = () => {
    const { fullName, location, email } = profile.personalDetails;
    if (!fullName) return 'Name, email, phone, location & profiles';
    const parts = [fullName];
    if (location) parts.push(location);
    else if (email) parts.push(email);
    return parts.join(' • ');
  };

  const getProfessionalSummary = () => {
    const { professionalTitle, professionalSummary } = profile.professionalInfo;
    if (!professionalTitle && !professionalSummary) return 'Title & career summary for resume intro';
    if (professionalTitle && professionalSummary) {
      return `${professionalTitle} — ${professionalSummary}`;
    }
    return professionalTitle || professionalSummary;
  };

  const getSkillsSummary = () => {
    if (profile.skills.length === 0) return 'Categorized technical & domain skills';
    const sample = profile.skills
      .slice(0, 4)
      .map((s) => s.name)
      .join(', ');
    return profile.skills.length > 4 ? `${sample}...` : sample;
  };

  const getExperienceSummary = () => {
    if (profile.experience.length === 0) return 'Employment history & accomplishments';
    const latest = profile.experience[0];
    return `${latest.jobTitle} at ${latest.company} (${latest.startDate || ''} - ${
      latest.currentlyWorking ? 'Present' : latest.endDate || 'Present'
    })`;
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
    if (profile.education.length === 0) return 'Degrees, universities & academic records';
    const latest = profile.education[0];
    return `${latest.degree}${latest.institution ? ` • ${latest.institution}` : ''}`;
  };

  const getCertificationsSummary = () => {
    if (profile.certifications.length === 0) return 'Certifications, licenses & credentials';
    const sample = profile.certifications
      .slice(0, 2)
      .map((c) => c.name)
      .join(', ');
    return profile.certifications.length > 2 ? `${sample}...` : sample;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Candidate Profile</Text>
        <Text style={styles.subtitle}>
          Single source of truth for resume tailoring and application tracking.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Notice banner */}
        <View style={styles.sourceOfTruthBanner}>
          <Text style={styles.bannerIcon}>🔒</Text>
          <Text style={styles.bannerText}>
            HireLog only tailors resumes using verified information entered here.
          </Text>
        </View>

        {/* 1. Personal Details */}
        <ProfileSectionCard
          title="Personal Details"
          icon="👤"
          summary={getPersonalSummary()}
          onEdit={() => setActiveModal('personal')}
          actionLabel={profile.personalDetails.fullName ? 'Edit' : 'Add'}
        />

        {/* 2. Professional Information */}
        <ProfileSectionCard
          title="Professional Info"
          icon="💼"
          summary={getProfessionalSummary()}
          onEdit={() => setActiveModal('professional')}
          actionLabel={profile.professionalInfo.professionalTitle ? 'Edit' : 'Add'}
        />

        {/* 3. Skills */}
        <ProfileSectionCard
          title="Skills"
          icon="⚡"
          itemCount={profile.skills.length}
          summary={getSkillsSummary()}
          onEdit={() => setActiveModal('skills')}
          actionLabel={profile.skills.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 4. Work Experience */}
        <ProfileSectionCard
          title="Work Experience"
          icon="🏢"
          itemCount={profile.experience.length}
          summary={getExperienceSummary()}
          onEdit={() => setActiveModal('experience')}
          actionLabel={profile.experience.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 5. Projects */}
        <ProfileSectionCard
          title="Projects"
          icon="🚀"
          itemCount={profile.projects.length}
          summary={getProjectsSummary()}
          onEdit={() => setActiveModal('projects')}
          actionLabel={profile.projects.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 6. Education */}
        <ProfileSectionCard
          title="Education"
          icon="🎓"
          itemCount={profile.education.length}
          summary={getEducationSummary()}
          onEdit={() => setActiveModal('education')}
          actionLabel={profile.education.length > 0 ? 'Manage' : 'Add'}
        />

        {/* 7. Certifications */}
        <ProfileSectionCard
          title="Certifications"
          icon="📜"
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
        onSave={(data: PersonalDetails) => {
          setProfile((prev) => ({ ...prev, personalDetails: data }));
        }}
      />

      <ProfessionalInfoModal
        visible={activeModal === 'professional'}
        initialData={profile.professionalInfo}
        onClose={() => setActiveModal(null)}
        onSave={(data: ProfessionalInfo) => {
          setProfile((prev) => ({ ...prev, professionalInfo: data }));
        }}
      />

      <SkillsModal
        visible={activeModal === 'skills'}
        skills={profile.skills}
        onClose={() => setActiveModal(null)}
        onSaveSkills={(skills: Skill[]) => {
          setProfile((prev) => ({ ...prev, skills }));
        }}
      />

      <ExperienceModal
        visible={activeModal === 'experience'}
        experiences={profile.experience}
        onClose={() => setActiveModal(null)}
        onSaveExperiences={(experience: Experience[]) => {
          setProfile((prev) => ({ ...prev, experience }));
        }}
      />

      <ProjectsModal
        visible={activeModal === 'projects'}
        projects={profile.projects}
        onClose={() => setActiveModal(null)}
        onSaveProjects={(projects: Project[]) => {
          setProfile((prev) => ({ ...prev, projects }));
        }}
      />

      <EducationModal
        visible={activeModal === 'education'}
        educationList={profile.education}
        onClose={() => setActiveModal(null)}
        onSaveEducation={(education: Education[]) => {
          setProfile((prev) => ({ ...prev, education }));
        }}
      />

      <CertificationsModal
        visible={activeModal === 'certifications'}
        certifications={profile.certifications}
        onClose={() => setActiveModal(null)}
        onSaveCertifications={(certifications: Certification[]) => {
          setProfile((prev) => ({ ...prev, certifications }));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  sourceOfTruthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  bannerIcon: {
    fontSize: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 16,
  },
});
