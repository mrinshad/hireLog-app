import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog, AppToast } from '@/context/DialogContext';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { CompilerError, latexCompiler } from '@/services/latex/compiler';
import { latexRenderer } from '@/services/latex/latexRenderer';
import { ResumeVersion } from '@/services/latex/types';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { resumeCustomizer } from '@/services/resume/resumeCustomizer';
import { resumeValidator } from '@/services/resume/resumeValidator';
import { workflowOrchestrator } from '@/services/workflow/workflowOrchestrator';
import { Job } from '@/types/job';
import { CustomizedResume } from '@/types/resume';

export default function ResumePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [customizedResume, setCustomizedResume] = useState<CustomizedResume | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  const loadData = async () => {
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
      const matchResult = jobData.matchResult || matchingEngine.match(profile, jobData.analysis);
      const tailored = resumeCustomizer.customize(
        profile,
        jobData.analysis,
        matchResult,
        jobData.id
      );
      setCustomizedResume(tailored);

      const existingVersions = await resumeRepository.getResumeVersions(jobData.id);
      setVersions(existingVersions);
      if (existingVersions.length > 0) {
        const approvedVer = existingVersions.find((v) => v.id === jobData.approvedResumeVersionId);
        setSelectedVersion(approvedVer || existingVersions[0]);
      }
    } catch (error) {
      console.error('Failed to load resume preview data:', error);
      AppDialog.error('Loading Error', 'Failed to load resume details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleApproveAndContinue = async () => {
    if (!job || !selectedVersion) return;

    if (selectedVersion.generationStatus !== 'Generated' || !selectedVersion.pdfPath) {
      AppDialog.alert(
        'PDF Not Ready',
        'Please ensure the PDF document has finished compiling before approving.'
      );
      return;
    }

    try {
      setIsApproving(true);
      const result = await workflowOrchestrator.approveResume(job.id, selectedVersion.id);

      if (result.success && result.nextRoute) {
        AppToast.show('Resume approved for application', 'success');
        router.replace(result.nextRoute as any);
      } else {
        AppDialog.error('Approval Issue', result.error || 'Failed to advance workflow.');
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      AppDialog.error('Approval Failed', error.message || 'Failed to approve resume.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleGenerateNewVersion = async () => {
    if (!job || !customizedResume) return;

    try {
      setIsGenerating(true);

      setGenerationStep('Validating against Profile...');
      const profile = await profileRepository.getProfile();
      resumeValidator.validate(profile, customizedResume);

      setGenerationStep('Rendering LaTeX markup...');
      const latexSource = latexRenderer.render(customizedResume);

      setGenerationStep('Saving version...');
      const newVersion = await resumeRepository.saveResumeVersion(
        job.id,
        customizedResume,
        latexSource,
        null,
        'Compiling',
        null,
        'master-v1'
      );

      setGenerationStep('Compiling PDF document...');
      try {
        const { pdfPath } = await latexCompiler.compileToPdf(
          latexSource,
          job.id,
          newVersion.id
        );

        await resumeRepository.updateResumePdf(newVersion.id, pdfPath, 'Generated', null);
        newVersion.pdfPath = pdfPath;
        newVersion.generationStatus = 'Generated';

        const updatedVersions = await resumeRepository.getResumeVersions(job.id);
        setVersions(updatedVersions);
        setSelectedVersion(newVersion);

        AppToast.show(`Resume version v${newVersion.versionNumber} ready`, 'success');
      } catch (compileErr: any) {
        const errorLog =
          compileErr instanceof CompilerError
            ? compileErr.compilerLog
            : compileErr.message || 'Unknown compilation error';

        await resumeRepository.updateResumePdf(
          newVersion.id,
          null,
          'Failed',
          errorLog
        );

        newVersion.generationStatus = 'Failed';
        newVersion.errorLog = errorLog;

        const updatedVersions = await resumeRepository.getResumeVersions(job.id);
        setVersions(updatedVersions);
        setSelectedVersion(newVersion);

        AppDialog.error(
          'Compilation Failed',
          compileErr.message || 'Failed to compile LaTeX into PDF.'
        );
      }
    } catch (error: any) {
      console.error('Resume generation error:', error);
      AppDialog.error('Generation Failed', error.message || 'Failed to generate resume.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleOpenPdf = async () => {
    if (!selectedVersion?.pdfPath) {
      AppDialog.alert('PDF Not Available', 'PDF file has not been compiled yet.');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        AppDialog.alert(
          'Document Viewer Unavailable',
          'Document viewing is not available on this platform.'
        );
        return;
      }

      await Sharing.shareAsync(selectedVersion.pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Resume - ${selectedVersion.targetRole}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      AppDialog.error('Viewer Error', 'Failed to open PDF document.');
    }
  };

  const handleCopyLatex = async () => {
    if (!selectedVersion) return;
    try {
      await Clipboard.setStringAsync(selectedVersion.latexSource);
      setIsCopied(true);
      AppToast.show('LaTeX code copied to clipboard', 'info');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      AppDialog.error('Copy Failed', 'Failed to copy LaTeX code.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading resume preview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job || !customizedResume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Resume Preview" showBack />
        <View style={styles.emptyContainer}>
          <Text style={Typography.sectionTitle}>Application Not Ready</Text>
          <PrimaryButton title="Return to Job" icon="arrow-left" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isApproved = job.approvedResumeVersionId === selectedVersion?.id;
  const isPdfReady = selectedVersion?.generationStatus === 'Generated' && !!selectedVersion.pdfPath;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Resume Approval"
        subtitle={job.company}
        showBack
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Hero Info Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleArea}>
              <Text style={Typography.screenTitle} numberOfLines={1}>
                {customizedResume.targetRole}
              </Text>
              <Text style={[Typography.itemTitle, { color: Colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {customizedResume.targetCompany}
              </Text>
            </View>
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{customizedResume.overallMatchScore}% Match</Text>
            </View>
          </View>

          {isApproved && (
            <View style={styles.approvedBanner}>
              <Feather name="check-circle" size={14} color={Colors.successText} />
              <Text style={styles.approvedBannerText}>Approved for Application</Text>
            </View>
          )}
        </Card>

        {/* Gate 1 Approval Action Card */}
        <Card style={styles.approvalGateCard}>
          <Text style={Typography.sectionTitle}>Review & Approve Resume</Text>
          <Text style={[Typography.caption, { marginVertical: Spacing.xs }]}>
            Review the tailored PDF resume below. Approving will automatically prepare the application email.
          </Text>

          {isPdfReady ? (
            <View style={styles.approvalActions}>
              <PrimaryButton
                title={isApproved ? 'Proceed to Email Review →' : 'Approve & Continue →'}
                icon="check"
                size="lg"
                loading={isApproving}
                onPress={handleApproveAndContinue}
                style={styles.primaryApproveBtn}
              />
              <View style={styles.subActionRow}>
                <SecondaryButton
                  title="Preview PDF"
                  icon="eye"
                  size="sm"
                  onPress={handleOpenPdf}
                  style={{ flex: 1 }}
                />
                <SecondaryButton
                  title="Share"
                  icon="share-2"
                  size="sm"
                  onPress={handleOpenPdf}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.compilingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={Typography.caption}>
                {generationStep || 'PDF document is compiling...'}
              </Text>
            </View>
          )}
        </Card>

        {/* Version Selector */}
        {versions.length > 1 && (
          <Card style={styles.card}>
            <Text style={Typography.sectionTitle}>Resume Versions ({versions.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.versionChipsRow}>
              {versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id;
                const isVersionApproved = ver.id === job.approvedResumeVersionId;
                return (
                  <TouchableOpacity
                    key={ver.id}
                    style={[
                      styles.versionChip,
                      isSelected && styles.versionChipSelected,
                      ver.generationStatus === 'Failed' && styles.versionChipFailed,
                    ]}
                    onPress={() => setSelectedVersion(ver)}>
                    <Text
                      style={[
                        styles.versionChipText,
                        isSelected && styles.versionChipTextSelected,
                      ]}>
                      {isVersionApproved ? '★ ' : '✓ '}
                      v{ver.versionNumber}
                      {isVersionApproved ? ' (Approved)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        )}

        {/* Regenerate Option */}
        <Card style={styles.card}>
          <Text style={Typography.sectionTitle}>Need Changes?</Text>
          <Text style={[Typography.caption, { marginVertical: Spacing.xs }]}>
            Generate a new version from your latest profile details without overwriting version history.
          </Text>

          {isGenerating ? (
            <View style={styles.generatingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={Typography.caption}>{generationStep || 'Compiling resume...'}</Text>
            </View>
          ) : (
            <SecondaryButton
              title="Generate New Version"
              icon="refresh-cw"
              size="sm"
              onPress={handleGenerateNewVersion}
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </Card>

        {/* LaTeX Source Inspector */}
        {selectedVersion && (
          <Card style={styles.card}>
            <View style={styles.latexHeaderRow}>
              <Text style={Typography.sectionTitle}>LaTeX Source (v{selectedVersion.versionNumber})</Text>
              <TouchableOpacity
                style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                onPress={handleCopyLatex}>
                <Feather
                  name={isCopied ? 'check' : 'copy'}
                  size={12}
                  color={isCopied ? Colors.successText : Colors.textSecondary}
                />
                <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                  {isCopied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.codeBox}>
              <ScrollView
                nestedScrollEnabled
                style={styles.codeScroll}
                contentContainerStyle={styles.codeScrollContent}>
                <Text style={styles.codeText} selectable>
                  {selectedVersion.latexSource}
                </Text>
              </ScrollView>
            </View>
          </Card>
        )}
      </ScrollView>
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
  matchBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
  },
  approvedBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.successText,
  },
  approvalGateCard: {
    marginBottom: Spacing.md,
    borderColor: Colors.primaryBorder,
  },
  approvalActions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  primaryApproveBtn: {
    marginBottom: Spacing.xs,
  },
  subActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  compilingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  card: {
    marginBottom: Spacing.md,
  },
  versionChipsRow: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  versionChip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  versionChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  versionChipFailed: {
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  versionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  versionChipTextSelected: {
    color: Colors.textInverse,
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  latexHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  copyBtnSuccess: {
    backgroundColor: Colors.successBg,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  copyBtnTextSuccess: {
    color: Colors.successText,
  },
  codeBox: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    maxHeight: 200,
  },
  codeScroll: {
    maxHeight: 180,
  },
  codeScrollContent: {
    paddingRight: Spacing.sm,
  },
  codeText: {
    color: '#E2E8F0',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
  },
});
