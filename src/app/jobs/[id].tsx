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

import { emailRepository } from '@/database/repositories/emailRepository';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { settingsRepository } from '@/database/repositories/settingsRepository';
import { geminiClient, GeminiError } from '@/services/gemini/client';
import { jdAnalyzer } from '@/services/gemini/jdAnalyzer';
import { ResumeVersion } from '@/services/latex/types';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { formatRelativeDate, STATUS_CONFIG } from '@/services/tracking/trackingHelpers';
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

      // Calculate profile match if analysis exists
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
      setIsAnalyzing(true);
      const apiKey = await settingsRepository.getGeminiApiKey();
      if (!apiKey) {
        Alert.alert(
          'API Key Required',
          'Please configure your Gemini API Key in Settings to analyze Job Descriptions.',
          [
            { text: 'Go to Settings', onPress: () => router.push('/settings') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      await jobRepository.updateJobAnalysis(job.id, 'Analyzing');
      const analysis = await jdAnalyzer.analyze(job.jobDescription);
      await jobRepository.updateJobAnalysis(job.id, 'Analyzed', analysis);

      await loadJobData();
      Alert.alert('Analysis Complete', 'Job requirements extracted successfully!');
    } catch (error: any) {
      console.error('JD Analysis error:', error);
      await jobRepository.updateJobAnalysis(job.id, 'Failed');
      Alert.alert(
        'Analysis Failed',
        error instanceof GeminiError ? error.message : 'Could not analyze Job Description.'
      );
      await loadJobData();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = () => {
    if (!job) return;

    Alert.alert(
      'Delete Job Posting?',
      `Are you sure you want to delete "${job.role}" at ${job.company}? Generated resumes and drafts for this job will also be removed.`,
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
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Job Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Jobs</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Job Not Found</Text>
          <TouchableOpacity style={styles.returnBtn} onPress={() => router.replace('/jobs')}>
            <Text style={styles.returnBtnText}>Return to Jobs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_CONFIG[job.status] || STATUS_CONFIG.Draft;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Jobs</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Job Details
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/jobs/edit/${job.id}`)}
          style={styles.editBtn}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Main Job Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleArea}>
              <Text style={styles.heroRole}>{job.role || 'Untitled Role'}</Text>
              <Text style={styles.heroCompany}>
                {job.company || 'Company not specified'}
                {job.location ? ` • 📍 ${job.location}` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
              ]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusStyle.icon} {statusStyle.label}
              </Text>
            </View>
          </View>

          {job.status === 'Applied' && job.appliedAt && (
            <View style={styles.appliedDateRow}>
              <Text style={styles.appliedDateText}>
                🚀 Application submitted on {formatRelativeDate(job.appliedAt)}
              </Text>
            </View>
          )}

          <View style={styles.statusActionRow}>
            <TouchableOpacity
              style={styles.changeStatusBtn}
              onPress={() => setShowStatusModal(true)}>
              <Text style={styles.changeStatusText}>⚡ Change Application Status</Text>
            </TouchableOpacity>

            {statusHistory.length > 0 && (
              <TouchableOpacity
                style={styles.historyToggleBtn}
                onPress={() => setShowHistory(!showHistory)}>
                <Text style={styles.historyToggleText}>
                  {showHistory ? '▲ Hide History' : `▼ History (${statusHistory.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status History Timeline */}
          {showHistory && statusHistory.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={styles.historyTitle}>Status Transitions</Text>
              {statusHistory.map((item, idx) => (
                <View key={item.id} style={styles.historyItem}>
                  <Text style={styles.historyIndex}>{idx + 1}.</Text>
                  <Text style={styles.historyText}>
                    <Text style={{ fontWeight: '600' }}>{item.oldStatus}</Text> →{' '}
                    <Text style={{ fontWeight: '700', color: '#2563EB' }}>
                      {item.newStatus}
                    </Text>
                  </Text>
                  <Text style={styles.historyDate}>
                    {formatRelativeDate(item.changedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ===================================================
            CONNECTED MODULES HUB
            =================================================== */}
        <Text style={styles.sectionHeaderTitle}>Application Pipeline Modules</Text>

        {/* Module 1: JD Analysis */}
        <View style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <View style={styles.moduleIconCircle}>
              <Text style={styles.moduleIcon}>🔍</Text>
            </View>
            <View style={styles.moduleTitleArea}>
              <Text style={styles.moduleTitle}>1. JD Analysis</Text>
              <Text style={styles.moduleSubtext}>
                {job.analysisStatus === 'Analyzed' && job.analysis
                  ? `${job.analysis.requiredSkills.length} required skills extracted`
                  : job.analysisStatus === 'Analyzing'
                  ? 'Analyzing with Gemini...'
                  : 'Extract skills and requirements'}
              </Text>
            </View>
            <View
              style={[
                styles.moduleStatusBadge,
                job.analysisStatus === 'Analyzed'
                  ? styles.badgeSuccess
                  : styles.badgeNeutral,
              ]}>
              <Text
                style={[
                  styles.moduleStatusBadgeText,
                  job.analysisStatus === 'Analyzed'
                    ? styles.badgeTextSuccess
                    : styles.badgeTextNeutral,
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
                <Text style={styles.moreSkillsText}>
                  +{job.analysis.requiredSkills.length - 4} more
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.moduleActionBtn}
              disabled={isAnalyzing}
              onPress={handleAnalyzeJD}>
              <Text style={styles.moduleActionBtnText}>
                {isAnalyzing ? 'Analyzing...' : '✨ Analyze JD with Gemini'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Module 2: Profile Match Analysis */}
        <View style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <View style={styles.moduleIconCircle}>
              <Text style={styles.moduleIcon}>🎯</Text>
            </View>
            <View style={styles.moduleTitleArea}>
              <Text style={styles.moduleTitle}>2. Profile Match</Text>
              <Text style={styles.moduleSubtext}>
                {matchResult
                  ? `${matchResult.overallScore}% overall match score`
                  : 'Deterministic local comparison'}
              </Text>
            </View>
            {matchResult ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>{matchResult.overallScore}%</Text>
              </View>
            ) : null}
          </View>

          {matchResult ? (
            <TouchableOpacity
              style={styles.moduleSecondaryBtn}
              onPress={() => router.push(`/jobs/customize/${job.id}`)}>
              <Text style={styles.moduleSecondaryBtnText}>
                View Match Breakdown & Tailor Resume →
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.moduleHint}>Analyze the JD above to view profile matching.</Text>
          )}
        </View>

        {/* Module 3: Tailored Resume (LaTeX / PDF) */}
        <View style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <View style={styles.moduleIconCircle}>
              <Text style={styles.moduleIcon}>📄</Text>
            </View>
            <View style={styles.moduleTitleArea}>
              <Text style={styles.moduleTitle}>3. Tailored Resume (PDF)</Text>
              <Text style={styles.moduleSubtext}>
                {latestResume?.pdfPath
                  ? `Version v${latestResume.versionNumber} ready`
                  : 'ATS-compliant resume generator'}
              </Text>
            </View>
            <View
              style={[
                styles.moduleStatusBadge,
                latestResume?.pdfPath ? styles.badgeSuccess : styles.badgeNeutral,
              ]}>
              <Text
                style={[
                  styles.moduleStatusBadgeText,
                  latestResume?.pdfPath ? styles.badgeTextSuccess : styles.badgeTextNeutral,
                ]}>
                {latestResume?.pdfPath ? 'PDF Ready' : 'Not Generated'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={latestResume?.pdfPath ? styles.moduleSuccessBtn : styles.moduleActionBtn}
            onPress={() => router.push(`/jobs/resume/${job.id}`)}>
            <Text style={styles.moduleActionBtnText}>
              {latestResume?.pdfPath
                ? `👁️ View / Share Resume (v${latestResume.versionNumber})`
                : '⚡ Customize & Generate Resume'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Module 4: Email Application */}
        <View style={styles.moduleCard}>
          <View style={styles.moduleTopRow}>
            <View style={styles.moduleIconCircle}>
              <Text style={styles.moduleIcon}>✉️</Text>
            </View>
            <View style={styles.moduleTitleArea}>
              <Text style={styles.moduleTitle}>4. Application Email</Text>
              <Text style={styles.moduleSubtext}>
                {emailDraft?.body
                  ? 'Draft prepared with resume attachment'
                  : 'Compose & launch email app'}
              </Text>
            </View>
            <View
              style={[
                styles.moduleStatusBadge,
                emailDraft?.body ? styles.badgeSuccess : styles.badgeNeutral,
              ]}>
              <Text
                style={[
                  styles.moduleStatusBadgeText,
                  emailDraft?.body ? styles.badgeTextSuccess : styles.badgeTextNeutral,
                ]}>
                {emailDraft?.body ? 'Draft Ready' : 'Not Prepared'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.moduleSecondaryBtn}
            onPress={() => router.push(`/jobs/email/${job.id}`)}>
            <Text style={styles.moduleSecondaryBtnText}>
              {emailDraft?.body ? '✉️ Open Email Composer' : '✉️ Prepare Application Email →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===================================================
            ORIGINAL RAW JOB DESCRIPTION
            =================================================== */}
        <View style={styles.jdCard}>
          <View style={styles.jdHeader}>
            <Text style={styles.jdTitle}>Original Job Description</Text>
            <TouchableOpacity onPress={() => setShowFullJd(!showFullJd)}>
              <Text style={styles.jdToggleText}>
                {showFullJd ? 'Collapse ▲' : 'Expand ▼'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.jdText} numberOfLines={showFullJd ? undefined : 6}>
            {job.jobDescription}
          </Text>
        </View>

        {/* Delete Job */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Job Posting</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===================================================
          STATUS CHANGER MODAL
          =================================================== */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.statusModalCard}>
            <Text style={styles.statusModalTitle}>Update Application Status</Text>
            <Text style={styles.statusModalSub}>
              Select current stage for {job.role} at {job.company}:
            </Text>

            <View style={styles.statusOptionsList}>
              {JOB_STATUSES.map((status) => {
                const conf = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
                const isCurrent = job.status === status;

                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOptionRow,
                      isCurrent && styles.statusOptionRowSelected,
                    ]}
                    onPress={() => handleStatusChange(status)}>
                    <Text style={styles.statusOptionIcon}>{conf.icon}</Text>
                    <Text
                      style={[
                        styles.statusOptionLabel,
                        isCurrent && styles.statusOptionLabelSelected,
                      ]}>
                      {status}
                    </Text>
                    {isCurrent && <Text style={styles.currentCheck}>✓ Active</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowStatusModal(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  heroTitleArea: {
    flex: 1,
    marginRight: 10,
  },
  heroRole: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroCompany: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appliedDateRow: {
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  appliedDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  statusActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  changeStatusBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  changeStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  historyToggleBtn: {
    padding: 6,
  },
  historyToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  historyBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  historyIndex: {
    fontSize: 11,
    color: '#94A3B8',
    width: 18,
  },
  historyText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  moduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  moduleIcon: {
    fontSize: 18,
  },
  moduleTitleArea: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  moduleSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  moduleStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeNeutral: {
    backgroundColor: '#F1F5F9',
  },
  moduleStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#16A34A',
  },
  badgeTextNeutral: {
    color: '#64748B',
  },
  scoreBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  skillsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  skillPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  moreSkillsText: {
    fontSize: 11,
    color: '#64748B',
  },
  moduleActionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  moduleSuccessBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  moduleActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moduleSecondaryBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  moduleSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  moduleHint: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  jdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  jdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jdTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  jdToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  jdText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  statusModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  statusModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  statusOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  statusOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptionRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  statusOptionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  statusOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  statusOptionLabelSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  currentCheck: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  closeModalBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
