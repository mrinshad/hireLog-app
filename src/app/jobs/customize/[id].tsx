import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { resumeCustomizer } from '@/services/resume/resumeCustomizer';
import { Job } from '@/types/job';
import { CustomizedResume } from '@/types/resume';

export default function ResumeCustomizationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [resume, setResume] = useState<CustomizedResume | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCustomizedResume() {
      if (!id) return;
      try {
        setIsLoading(true);
        const jobData = await jobRepository.getJob(id);
        setJob(jobData);

        if (!jobData || !jobData.analysis) {
          setIsLoading(false);
          return;
        }

        const profile = await profileRepository.getProfile();
        const matchResult = matchingEngine.match(profile, jobData.analysis);
        const customized = resumeCustomizer.customize(
          profile,
          jobData.analysis,
          matchResult,
          jobData.id
        );
        setResume(customized);
      } catch (error) {
        console.error('Failed to customize resume:', error);
        Alert.alert('Error', 'Failed to generate tailored resume content.');
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomizedResume();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Customizing resume for this role...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job || !resume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resume Customization</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>JD Analysis Required</Text>
          <Text style={styles.emptySubtext}>
            Please analyze the Job Description with Gemini first before tailoring your resume.
          </Text>
          <TouchableOpacity style={styles.returnBtn} onPress={() => router.back()}>
            <Text style={styles.returnBtnText}>Return to Job</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const requiredSkills = resume.skills.filter((s) => s.priority === 'required');
  const preferredSkills = resume.skills.filter((s) => s.priority === 'preferred');
  const generalSkills = resume.skills.filter((s) => s.priority === 'general');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Tailored Resume
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Hero Job Match Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleArea}>
              <Text style={styles.heroRole}>{resume.targetRole}</Text>
              <Text style={styles.heroCompany}>{resume.targetCompany}</Text>
            </View>
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{resume.overallMatchScore}% Match</Text>
            </View>
          </View>
          <Text style={styles.heroSubtext}>
            Content below was selected and prioritized from your verified profile to specifically match this role.
          </Text>
        </View>

        {/* Tailored Professional Summary */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📝 Professional Summary</Text>
            <View style={styles.traceBadge}>
              <Text style={styles.traceBadgeText}>Factual</Text>
            </View>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{resume.summary}</Text>
          </View>
        </View>

        {/* Selected Skills */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              ⚡ Selected Skills ({resume.skills.length})
            </Text>
            <View style={styles.traceBadge}>
              <Text style={styles.traceBadgeText}>Prioritized</Text>
            </View>
          </View>

          {/* Required Matches */}
          {requiredSkills.length > 0 && (
            <View style={styles.skillGroup}>
              <Text style={styles.skillGroupLabel}>Core JD Requirements ({requiredSkills.length})</Text>
              <View style={styles.chipsWrapper}>
                {requiredSkills.map((s) => (
                  <View key={s.profileId} style={styles.requiredSkillChip}>
                    <Text style={styles.checkIcon}>✓</Text>
                    <Text style={styles.requiredSkillText}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Preferred Matches */}
          {preferredSkills.length > 0 && (
            <View style={styles.skillGroup}>
              <Text style={styles.skillGroupLabel}>Preferred / Bonus Skills ({preferredSkills.length})</Text>
              <View style={styles.chipsWrapper}>
                {preferredSkills.map((s) => (
                  <View key={s.profileId} style={styles.preferredSkillChip}>
                    <Text style={styles.checkIcon}>✓</Text>
                    <Text style={styles.preferredSkillText}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Additional Relevant Skills */}
          {generalSkills.length > 0 && (
            <View style={styles.skillGroup}>
              <Text style={styles.skillGroupLabel}>Additional Relevant Skills ({generalSkills.length})</Text>
              <View style={styles.chipsWrapper}>
                {generalSkills.map((s) => (
                  <View key={s.profileId} style={styles.generalSkillChip}>
                    <Text style={styles.generalSkillText}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Selected Work Experience */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              💼 Selected Experience ({resume.experience.length})
            </Text>
            <View style={styles.traceBadge}>
              <Text style={styles.traceBadgeText}>Ranked</Text>
            </View>
          </View>
          {resume.experience.length === 0 ? (
            <Text style={styles.emptySectionText}>No work experience recorded in profile.</Text>
          ) : (
            resume.experience.map((exp, idx) => (
              <View key={exp.profileId} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemTitleArea}>
                    <Text style={styles.itemName}>
                      {idx + 1}. {exp.company}
                    </Text>
                    <Text style={styles.itemSub}>{exp.jobTitle}</Text>
                  </View>
                  {exp.relevanceScore > 0 && (
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillText}>{exp.relevanceScore}% match</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemDate}>
                  {exp.startDate} – {exp.currentlyWorking ? 'Present' : exp.endDate} • {exp.location}
                </Text>
                {exp.description ? (
                  <Text style={styles.itemDesc} numberOfLines={3}>
                    {exp.description}
                  </Text>
                ) : null}
                {exp.technologies ? (
                  <View style={styles.techPillsRow}>
                    <Text style={styles.techLabel}>Tech: </Text>
                    <Text style={styles.techVal}>{exp.technologies}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Selected Projects */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              🚀 Selected Projects ({resume.projects.length})
            </Text>
            <View style={styles.traceBadge}>
              <Text style={styles.traceBadgeText}>Top Relevant</Text>
            </View>
          </View>
          {resume.projects.length === 0 ? (
            <Text style={styles.emptySectionText}>No projects recorded in profile.</Text>
          ) : (
            resume.projects.map((proj, idx) => (
              <View key={proj.profileId} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemTitleArea}>
                    <Text style={styles.itemName}>
                      {idx + 1}. {proj.projectName}
                    </Text>
                    {proj.projectTypeOrDomain ? (
                      <Text style={styles.itemSub}>{proj.projectTypeOrDomain}</Text>
                    ) : null}
                  </View>
                  {proj.relevanceScore > 0 && (
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillText}>{proj.relevanceScore}% match</Text>
                    </View>
                  )}
                </View>
                {proj.description ? (
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {proj.description}
                  </Text>
                ) : null}
                {proj.technologies ? (
                  <View style={styles.techPillsRow}>
                    <Text style={styles.techLabel}>Tech: </Text>
                    <Text style={styles.techVal}>{proj.technologies}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Education & Certifications */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🎓 Education & Credentials</Text>
          <View style={styles.metaList}>
            {resume.education.map((edu) => (
              <View key={edu.profileId} style={styles.eduRow}>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduInst}>
                  {edu.institution} ({edu.startDate} – {edu.endDate})
                </Text>
              </View>
            ))}
            {resume.certifications.map((cert) => (
              <View key={cert.profileId} style={styles.certRow}>
                <Text style={styles.certName}>🏅 {cert.name}</Text>
                <Text style={styles.certOrg}>
                  {cert.issuingOrganization} • {cert.issueDate}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Unmatched JD Skills / Not Included */}
        {resume.unmatchedJdSkills.length > 0 && (
          <View style={styles.unmatchedCard}>
            <View style={styles.unmatchedHeader}>
              <Text style={styles.unmatchedTitle}>⚠️ Missing JD Skills (Not Included)</Text>
            </View>
            <Text style={styles.unmatchedSubtext}>
              The following technologies were requested by the JD but are not in your Profile. HireLog never invents unverified skills.
            </Text>
            <View style={styles.unmatchedChipsWrapper}>
              {resume.unmatchedJdSkills.map((skill, idx) => (
                <View key={idx} style={styles.unmatchedChip}>
                  <Text style={styles.unmatchedCross}>✕</Text>
                  <Text style={styles.unmatchedText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Button: Continue to Resume */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Resume Content Ready',
              'Tailored resume data is ready! In the upcoming module, this will compile directly into your LaTeX template.',
              [{ text: 'OK' }]
            );
          }}>
          <Text style={styles.continueBtnText}>Continue to Resume →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  returnBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroTitleArea: {
    flex: 1,
    marginRight: 10,
  },
  heroRole: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
  },
  heroCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  heroSubtext: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  traceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  traceBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  summaryText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  skillGroup: {
    marginBottom: 12,
  },
  skillGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requiredSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  requiredSkillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  preferredSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  preferredSkillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  generalSkillChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  generalSkillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  checkIcon: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '800',
  },
  emptySectionText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  itemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitleArea: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSub: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 1,
  },
  scorePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  itemDate: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  itemDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    marginBottom: 6,
  },
  techPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  techLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  techVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '500',
  },
  metaList: {
    marginTop: 8,
    gap: 8,
  },
  eduRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eduDegree: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  eduInst: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  certRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  certName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  certOrg: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  unmatchedCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    marginBottom: 20,
  },
  unmatchedHeader: {
    marginBottom: 6,
  },
  unmatchedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  unmatchedSubtext: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginBottom: 10,
  },
  unmatchedChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unmatchedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  unmatchedCross: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '800',
  },
  unmatchedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  continueBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
