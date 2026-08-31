import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { DestructiveButton, PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { emailRepository } from '@/database/repositories/emailRepository';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { settingsRepository } from '@/database/repositories/settingsRepository';
import { geminiClient, GeminiError } from '@/services/gemini/client';
import { jdAnalyzer } from '@/services/gemini/jdAnalyzer';
import { ResumeVersion } from '@/services/latex/types';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
import { EmailDraft } from '@/types/email';
import { Job, JOB_STATUSES, JobStatus, JobStatusHistory } from '@/types/job';
import { MatchResult } from '@/types/matching';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [statusHistory, setStatusHistory] = useState<JobStatusHistory[]>([]);
  const [latestResume, setLatestResume] = useState<ResumeVersion | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFullJd, setShowFullJd] = useState(false);

  const loadJobData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [jobData, historyData, resumeVer, draft] = await Promise.all([
        jobRepository.getJob(id),
        jobRepository.getStatusHistory(id),
        resumeRepository.getLatestResumeVersion(id),
        emailRepository.getDraftByJobId(id),
      ]);

      setJob(jobData);
      setStatusHistory(historyData);
      setLatestResume(resumeVer);
      setEmailDraft(draft);

      if (jobData?.analysis) {
        const profile = await profileRepository.getProfile();
        const match = matchingEngine.match(profile, jobData.analysis);
        setMatchResult(match);
      }
    } catch (error) {
      console.error('Failed to load job details:', error);
      Alert.alert('Error', 'Failed to load job details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [id]);

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job || job.status === newStatus) {
      setShowStatusModal(false);
      return;
    }

    try {
      const updated = await jobRepository.updateJobStatus(job.id, newStatus);
      const updatedHistory = await jobRepository.getStatusHistory(job.id);
      setJob(updated);
      setStatusHistory(updatedHistory);
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleAnalyzeJD = async () => {
    if (!job) return;

    try {
      const apiKey = await settingsRepository.getGeminiApiKey();
      if (!apiKey) {
        Alert.alert('API Key Required', 'Please configure your Gemini API Key in Settings first.');
        return;
      }

      setIsAnalyzing(true);
      const analysis = await jdAnalyzer.analyze(job.jobDescription);
      await jobRepository.updateJobAnalysis(job.id, 'Analyzed', analysis);
      const updatedJob = await jobRepository.getJob(job.id);
      setJob(updatedJob);

      const profile = await profileRepository.getProfile();
      const match = matchingEngine.match(profile, analysis);
      setMatchResult(match);
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error instanceof GeminiError ? error.message : 'Could not analyze job description.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteJob = () => {
    if (!job) return;

    Alert.alert(
      'Delete Job?',
      `Delete application for ${job.company || 'this job'}? Associated resume versions and drafts will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobRepository.deleteJob(job.id);
              router.replace('/jobs');
            } catch (error) {
              console.error('Failed to delete job:', error);
              Alert.alert('Error', 'Failed to delete job.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Job Details" showBack />
        <View style={styles.emptyContainer}>
          <Text style={Typography.sectionTitle}>Job Not Found</Text>
          <PrimaryButton title="Return to Jobs" icon="arrow-left" onPress={() => router.replace('/jobs')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Job Details"
        subtitle={job.company}
        showBack
        rightAction={
          <SecondaryButton
            title="Edit"
            icon="edit-2"
            size="sm"
            onPress={() => router.push(`/jobs/edit/${job.id}`)}
          />
        }
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleArea}>
              <Text style={Typography.screenTitle} numberOfLines={1}>
                {job.role || 'Untitled Role'}
              </Text>
              <Text style={[Typography.itemTitle, { color: Colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {job.company || 'Company not specified'}
                {job.location ? ` • ${job.location}` : ''}
              </Text>
            </View>
            <StatusBadge status={job.status} size="md" />
          </View>

          {job.status === 'Applied' && job.appliedAt && (
            <View style={styles.appliedDateRow}>
              <Feather name="send" size={IconSizes.xs} color={Colors.primaryDark} />
              <Text style={styles.appliedDateText}>
                Applied {formatRelativeDate(job.appliedAt)}
              </Text>
            </View>
          )}

          <View style={styles.statusActionRow}>
            <SecondaryButton
              title="Change Status"
              icon="refresh-cw"
              size="sm"
              onPress={() => setShowStatusModal(true)}
            />
            {statusHistory.length > 0 && (
              <TouchableOpacity
                style={styles.historyToggleBtn}
                onPress={() => setShowHistory(!showHistory)}>
                <Text style={styles.historyToggleText}>
                  {showHistory ? 'Hide History' : `History (${statusHistory.length})`}
                </Text>
                <Feather
                  name={showHistory ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Status History */}
          {showHistory && statusHistory.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={Typography.caption}>Status Transitions</Text>
              {statusHistory.map((item, idx) => (
                <View key={item.id} style={styles.historyItem}>
                  <Text style={Typography.caption}>{idx + 1}.</Text>
                  <Text style={Typography.bodyMedium}>
                    {item.oldStatus} → <Text style={{ color: Colors.primary }}>{item.newStatus}</Text>
                  </Text>
                  <Text style={[Typography.caption, { marginLeft: 'auto' }]}>
                    {formatRelativeDate(item.changedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Workflow Actions */}
        <Text style={[Typography.sectionTitle, { marginBottom: Spacing.sm }]}>Workflow</Text>

        {/* 1. JD Analysis */}
        <Card style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <Feather name="search" size={IconSizes.md} color={Colors.primary} />
            <View style={styles.moduleTitleArea}>
              <Text style={Typography.itemTitle}>1. JD Analysis</Text>
              <Text style={Typography.caption}>
                {job.analysisStatus === 'Analyzed' && job.analysis
                  ? `${job.analysis.requiredSkills.length} required skills extracted`
                  : job.analysisStatus === 'Analyzing'
                  ? 'Analyzing...'
                  : 'Extract skills and requirements'}
              </Text>
            </View>
            <View
              style={[
                styles.moduleStatusPill,
                job.analysisStatus === 'Analyzed' ? styles.statusPillSuccess : styles.statusPillNeutral,
              ]}>
              <Text
                style={[
                  styles.moduleStatusPillText,
                  job.analysisStatus === 'Analyzed' ? styles.statusPillTextSuccess : styles.statusPillTextNeutral,
                ]}>
                {job.analysisStatus}
              </Text>
            </View>
          </View>

          {job.analysis ? (
            <View style={styles.skillsSummaryRow}>
              {job.analysis.requiredSkills.slice(0, 4).map((skill, idx) => (
                <View key={idx} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill}</Text>
                </View>
              ))}
              {job.analysis.requiredSkills.length > 4 && (
                <Text style={Typography.caption}>+{job.analysis.requiredSkills.length - 4} more</Text>
              )}
            </View>
          ) : (
            <PrimaryButton
              title="Analyze JD with Gemini"
              icon="cpu"
              size="sm"
              loading={isAnalyzing}
              onPress={handleAnalyzeJD}
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </Card>

        {/* 2. Profile Match */}
        <Card style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <Feather name="target" size={IconSizes.md} color={Colors.primary} />
            <View style={styles.moduleTitleArea}>
              <Text style={Typography.itemTitle}>2. Profile Match</Text>
              <Text style={Typography.caption}>
                {matchResult ? `${matchResult.overallScore}% overall score` : 'Deterministic local comparison'}
              </Text>
            </View>
            {matchResult && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>{matchResult.overallScore}%</Text>
              </View>
            )}
          </View>

          {matchResult ? (
            <SecondaryButton
              title="Match Breakdown & Tailor"
              icon="chevron-right"
              size="sm"
              onPress={() => router.push(`/jobs/customize/${job.id}`)}
              style={{ marginTop: Spacing.sm }}
            />
          ) : null}
        </Card>

        {/* 3. Tailored Resume */}
        <Card style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <Feather name="file-text" size={IconSizes.md} color={Colors.primary} />
            <View style={styles.moduleTitleArea}>
              <Text style={Typography.itemTitle}>3. Tailored Resume (PDF)</Text>
              <Text style={Typography.caption}>
                {latestResume?.pdfPath ? `Version v${latestResume.versionNumber} ready` : 'Master LaTeX template generator'}
              </Text>
            </View>
            <View
              style={[
                styles.moduleStatusPill,
                latestResume?.pdfPath ? styles.statusPillSuccess : styles.statusPillNeutral,
              ]}>
              <Text
                style={[
                  styles.moduleStatusPillText,
                  latestResume?.pdfPath ? styles.statusPillTextSuccess : styles.statusPillTextNeutral,
                ]}>
                {latestResume?.pdfPath ? 'PDF Ready' : 'Pending'}
              </Text>
            </View>
          </View>

          <PrimaryButton
            title={latestResume?.pdfPath ? `View Resume (v${latestResume.versionNumber})` : 'Customize & Generate Resume'}
            icon="file-text"
            size="sm"
            onPress={() => router.push(`/jobs/resume/${job.id}`)}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        {/* 4. Application Email */}
        <Card style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <Feather name="mail" size={IconSizes.md} color={Colors.primary} />
            <View style={styles.moduleTitleArea}>
              <Text style={Typography.itemTitle}>4. Application Email</Text>
              <Text style={Typography.caption}>
                {emailDraft?.body ? 'Draft prepared with resume attachment' : 'Compose & launch email app'}
              </Text>
            </View>
            <View
              style={[
                styles.moduleStatusPill,
                emailDraft?.body ? styles.statusPillSuccess : styles.statusPillNeutral,
              ]}>
              <Text
                style={[
                  styles.moduleStatusPillText,
                  emailDraft?.body ? styles.statusPillTextSuccess : styles.statusPillTextNeutral,
                ]}>
                {emailDraft?.body ? 'Draft Ready' : 'Not Prepared'}
              </Text>
            </View>
          </View>

          <SecondaryButton
            title={emailDraft?.body ? 'Open Email Composer' : 'Prepare Application Email'}
            icon="mail"
            size="sm"
            onPress={() => router.push(`/jobs/email/${job.id}`)}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        {/* Raw Job Description */}
        <Card style={styles.moduleCard}>
          <View style={styles.rowBetween}>
            <Text style={Typography.sectionTitle}>Job Description</Text>
            <TouchableOpacity onPress={() => setShowFullJd(!showFullJd)}>
              <Text style={styles.toggleJdText}>{showFullJd ? 'Collapse' : 'Expand'}</Text>
            </TouchableOpacity>
          </View>
          <Text
            style={[Typography.body, { marginTop: Spacing.sm }]}
            numberOfLines={showFullJd ? undefined : 4}>
            {job.jobDescription}
          </Text>
        </Card>

        {/* Delete Job */}
        <DestructiveButton
          title="Delete Application"
          onPress={handleDeleteJob}
          style={{ marginTop: Spacing.sm, marginBottom: Spacing.xxl }}
        />
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={Typography.sectionTitle}>Change Application Status</Text>
            <View style={styles.statusOptions}>
              {JOB_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOptionRow,
                    job.status === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => handleStatusChange(status)}>
                  <StatusBadge status={status} size="sm" />
                  {job.status === status && (
                    <Feather name="check" size={14} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <SecondaryButton
              title="Cancel"
              size="sm"
              onPress={() => setShowStatusModal(false)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  heroCard: {
    marginBottom: Spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  heroTitleArea: {
    flex: 1,
  },
  appliedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  appliedDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  statusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  historyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  historyToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  historyBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  moduleCard: {
    marginBottom: Spacing.md,
  },
  moduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  moduleTitleArea: {
    flex: 1,
  },
  moduleStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusPillSuccess: {
    backgroundColor: Colors.successBg,
  },
  statusPillNeutral: {
    backgroundColor: Colors.surfaceSubtle,
  },
  moduleStatusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusPillTextSuccess: {
    color: Colors.successText,
  },
  statusPillTextNeutral: {
    color: Colors.textSecondary,
  },
  skillsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  skillPill: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skillPillText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  scoreBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleJdText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
  },
  statusOptions: {
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  statusOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  statusOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
});
