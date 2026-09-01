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
import { AppDialog, AppToast } from '@/context/DialogContext';
import { jobRepository } from '@/database/repositories/jobRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { ResumeVersion } from '@/services/latex/types';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
import { workflowOrchestrator } from '@/services/workflow/workflowOrchestrator';
import { Job, JOB_STATUSES, JobStatus, JobStatusHistory } from '@/types/job';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [statusHistory, setStatusHistory] = useState<JobStatusHistory[]>([]);
  const [latestResume, setLatestResume] = useState<ResumeVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFullJd, setShowFullJd] = useState(false);

  const loadJobData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [jobData, historyData, resumeVer] = await Promise.all([
        jobRepository.getJob(id),
        jobRepository.getStatusHistory(id),
        resumeRepository.getLatestResumeVersion(id),
      ]);

      setJob(jobData);
      setStatusHistory(historyData);
      setLatestResume(resumeVer);
    } catch (error) {
      console.error('Failed to load job details:', error);
      AppDialog.error('Loading Error', 'Failed to load job details.');
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
      AppToast.show(`Status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Failed to update status:', error);
      AppDialog.error('Status Error', 'Failed to update status.');
    }
  };

  const handleConfirmSent = async () => {
    if (!job) return;
    try {
      await workflowOrchestrator.confirmApplicationSent(job.id);
      await loadJobData();
      AppToast.show('Application marked as Applied!', 'success');
    } catch (error) {
      console.error('Failed to mark applied:', error);
      AppDialog.error('Update Error', 'Failed to update application status.');
    }
  };

  const handleDeleteJob = () => {
    if (!job) return;

    AppDialog.confirm(
      'Delete Application',
      `Delete application for ${job.company || 'this job'}? Associated resume versions and drafts will also be removed.`,
      async () => {
        try {
          await jobRepository.deleteJob(job.id);
          AppToast.show('Application deleted', 'info');
          router.replace('/jobs');
        } catch (error) {
          console.error('Failed to delete job:', error);
          AppDialog.error('Delete Failed', 'Failed to delete application.');
        }
      },
      'Delete',
      'Cancel',
      true
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

  // Determine stage & next action based on workflow state
  const isJdAnalyzed = Boolean(job.analysis || job.matchResult || job.analysisStatus === 'Analyzed');
  const isProfileMatched = Boolean(job.matchResult);
  const isResumeGenerated = Boolean(
    latestResume && (latestResume.generationStatus === 'Generated' || latestResume.latexSource)
  );
  const isResumeApproved = Boolean(job.approvedResumeVersionId);
  const isApplied = job.status === 'Applied';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={job.company || 'Job Details'}
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

          {isApplied && job.appliedAt && (
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

        {/* =========================================================================
            PRIMARY WORKFLOW ORCHESTRATION CARD
            ========================================================================= */}
        <Card style={styles.workflowCard}>
          <View style={styles.workflowHeader}>
            <Feather name="activity" size={IconSizes.md} color={Colors.primary} />
            <Text style={Typography.sectionTitle}>Application Workflow</Text>
          </View>

          {/* Contextual description & single primary action based on workflow state */}
          {job.workflowState === 'RESUME_REVIEW' ? (
            <View style={styles.workflowStateContent}>
              <View style={styles.stateNoticeBox}>
                <Feather name="file-text" size={IconSizes.sm} color={Colors.primary} />
                <Text style={styles.stateNoticeText}>
                  Resume generated and awaiting your review.
                </Text>
              </View>
              <PrimaryButton
                title="Review & Approve Resume →"
                icon="check-circle"
                size="lg"
                onPress={() => router.push(`/jobs/resume/${job.id}`)}
                style={styles.workflowPrimaryBtn}
              />
            </View>
          ) : job.workflowState === 'EMAIL_REVIEW' ? (
            <View style={styles.workflowStateContent}>
              <View style={styles.stateNoticeBox}>
                <Feather name="mail" size={IconSizes.sm} color={Colors.primary} />
                <Text style={styles.stateNoticeText}>
                  Resume approved. Application email ready for review.
                </Text>
              </View>
              <PrimaryButton
                title="Review & Send Email →"
                icon="mail"
                size="lg"
                onPress={() => router.push(`/jobs/email/${job.id}`)}
                style={styles.workflowPrimaryBtn}
              />
            </View>
          ) : job.workflowState === 'EMAIL_OPENED' ? (
            <View style={styles.workflowStateContent}>
              <View style={styles.stateNoticeBox}>
                <Feather name="external-link" size={IconSizes.sm} color={Colors.primary} />
                <Text style={styles.stateNoticeText}>
                  Email application was opened in your email client.
                </Text>
              </View>
              <View style={styles.dualActionRow}>
                <PrimaryButton
                  title="Mark as Applied"
                  icon="check"
                  size="md"
                  onPress={handleConfirmSent}
                  style={{ flex: 1 }}
                />
                <SecondaryButton
                  title="Reopen Email"
                  icon="mail"
                  size="md"
                  onPress={() => router.push(`/jobs/email/${job.id}`)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : job.workflowState === 'APPLIED' ? (
            <View style={styles.workflowStateContent}>
              <View style={styles.successNoticeBox}>
                <Feather name="check-circle" size={IconSizes.sm} color={Colors.successText} />
                <Text style={styles.successNoticeText}>
                  Application submitted and active!
                </Text>
              </View>
              <View style={styles.dualActionRow}>
                <SecondaryButton
                  title="View Resume"
                  icon="file-text"
                  size="sm"
                  onPress={() => router.push(`/jobs/resume/${job.id}`)}
                  style={{ flex: 1 }}
                />
                <SecondaryButton
                  title="View Email Draft"
                  icon="mail"
                  size="sm"
                  onPress={() => router.push(`/jobs/email/${job.id}`)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : job.workflowState === 'FAILED' ? (
            <View style={styles.workflowStateContent}>
              <View style={styles.errorNoticeBox}>
                <Feather name="alert-circle" size={IconSizes.sm} color={Colors.errorText} />
                <Text style={styles.errorNoticeText}>
                  {job.workflowErrorMessage || 'Pipeline encountered an issue.'}
                </Text>
              </View>
              <PrimaryButton
                title="Retry Pipeline"
                icon="refresh-cw"
                size="md"
                onPress={() => router.push(`/jobs/progress/${job.id}`)}
                style={styles.workflowPrimaryBtn}
              />
            </View>
          ) : (
            <View style={styles.workflowStateContent}>
              <View style={styles.stateNoticeBox}>
                <Feather name="play" size={IconSizes.sm} color={Colors.primary} />
                <Text style={styles.stateNoticeText}>
                  Application ready for automated processing.
                </Text>
              </View>
              <PrimaryButton
                title="Start Automated Pipeline →"
                icon="play"
                size="lg"
                onPress={() => router.push(`/jobs/progress/${job.id}`)}
                style={styles.workflowPrimaryBtn}
              />
            </View>
          )}

          {/* Clean Progress Checklist */}
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Feather name="check" size={13} color={Colors.successText} />
              <Text style={styles.checkText}>Job created</Text>
            </View>
            <View style={styles.checkItem}>
              <Feather
                name={isJdAnalyzed ? 'check' : 'circle'}
                size={13}
                color={isJdAnalyzed ? Colors.successText : Colors.textMuted}
              />
              <Text style={[styles.checkText, !isJdAnalyzed && styles.checkTextPending]}>
                JD analyzed with extracted skills
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Feather
                name={isProfileMatched ? 'check' : 'circle'}
                size={13}
                color={isProfileMatched ? Colors.successText : Colors.textMuted}
              />
              <Text style={[styles.checkText, !isProfileMatched && styles.checkTextPending]}>
                Profile matched deterministically
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Feather
                name={isResumeApproved ? 'check' : isResumeGenerated ? 'clock' : 'circle'}
                size={13}
                color={
                  isResumeApproved
                    ? Colors.successText
                    : isResumeGenerated
                    ? Colors.warningText
                    : Colors.textMuted
                }
              />
              <Text
                style={[
                  styles.checkText,
                  !isResumeApproved && !isResumeGenerated && styles.checkTextPending,
                ]}>
                {isResumeApproved
                  ? 'Resume approved'
                  : isResumeGenerated
                  ? 'Resume generated (awaiting review)'
                  : 'Resume tailored'}
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Feather
                name={isApplied ? 'check' : 'circle'}
                size={13}
                color={isApplied ? Colors.successText : Colors.textMuted}
              />
              <Text style={[styles.checkText, !isApplied && styles.checkTextPending]}>
                Application sent & confirmed
              </Text>
            </View>
          </View>
        </Card>

        {/* Raw Job Description */}
        <Card style={styles.card}>
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
    marginBottom: Spacing.md,
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
  workflowCard: {
    marginBottom: Spacing.md,
    borderColor: Colors.primaryBorder,
  },
  workflowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  workflowStateContent: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stateNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  stateNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
    flex: 1,
  },
  successNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  successNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.successText,
    flex: 1,
  },
  errorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorText,
    flex: 1,
  },
  workflowPrimaryBtn: {
    marginTop: Spacing.xs,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  checklist: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  checkTextPending: {
    color: Colors.textMuted,
  },
  card: {
    marginBottom: Spacing.md,
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
