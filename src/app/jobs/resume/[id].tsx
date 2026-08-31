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
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { CompilerError, latexCompiler } from '@/services/latex/compiler';
import { latexRenderer } from '@/services/latex/latexRenderer';
import { ResumeVersion } from '@/services/latex/types';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { resumeCustomizer } from '@/services/resume/resumeCustomizer';
import { resumeValidator, ResumeValidationError } from '@/services/resume/resumeValidator';
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
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(false);

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
      const matchResult = matchingEngine.match(profile, jobData.analysis);
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
        setSelectedVersion(existingVersions[0]);
      }
    } catch (error) {
      console.error('Failed to load resume preview data:', error);
      Alert.alert('Error', 'Failed to load resume details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleGenerateResume = async () => {
    if (!job || !customizedResume) return;

    try {
      setIsGenerating(true);
      setShowErrorLog(false);

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

        Alert.alert(
          'Resume Generated',
          `Resume version v${newVersion.versionNumber} has been compiled and saved.`
        );
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

        Alert.alert(
          'Compilation Failed',
          compileErr.message || 'Failed to compile LaTeX to PDF.'
        );
      }
    } catch (error: any) {
      console.error('Resume generation error:', error);
      Alert.alert('Error', error.message || 'Failed to generate resume.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleOpenPdf = async () => {
    if (!selectedVersion?.pdfPath) {
      Alert.alert('PDF Not Available', 'PDF file has not been compiled yet.');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Sharing Unavailable',
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
      Alert.alert('Error', 'Failed to open PDF file.');
    }
  };

  const handleCopyLatex = async () => {
    if (!selectedVersion) return;
    try {
      await Clipboard.setStringAsync(selectedVersion.latexSource);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy LaTeX source.');
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
          <Text style={Typography.sectionTitle}>JD Analysis Required</Text>
          <PrimaryButton title="Return to Job" icon="arrow-left" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Resume Preview"
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
        </Card>

        {/* Version History Selector */}
        {versions.length > 0 && (
          <Card style={styles.card}>
            <Text style={Typography.sectionTitle}>Versions ({versions.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.versionChipsRow}>
              {versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id;
                const isSuccess = ver.generationStatus === 'Generated' && ver.pdfPath;
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
                      {isSuccess ? '✓ ' : ver.generationStatus === 'Failed' ? '✕ ' : ''}
                      v{ver.versionNumber} •{' '}
                      {new Date(ver.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        )}

        {/* Active PDF Status & Actions */}
        {selectedVersion?.generationStatus === 'Generated' && selectedVersion.pdfPath ? (
          <Card style={styles.card}>
            <View style={styles.readyRow}>
              <Feather name="check-circle" size={IconSizes.sm} color={Colors.successText} />
              <View style={{ flex: 1 }}>
                <Text style={Typography.bodyMedium}>Resume PDF Ready (v{selectedVersion.versionNumber})</Text>
                <Text style={Typography.caption}>Saved to on-device storage</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <PrimaryButton
                title="Preview PDF"
                icon="eye"
                onPress={handleOpenPdf}
                style={{ flex: 1 }}
              />
              <SecondaryButton
                title="Share"
                icon="share-2"
                onPress={handleOpenPdf}
                style={{ flex: 1 }}
              />
            </View>

            <SecondaryButton
              title="Compose Application Email"
              icon="mail"
              onPress={() => router.push(`/jobs/email/${job.id}`)}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        ) : selectedVersion?.generationStatus === 'Failed' ? (
          <Card style={styles.card}>
            <Text style={[Typography.sectionTitle, { color: Colors.errorText }]}>
              Compilation Failed
            </Text>
            <Text style={[Typography.caption, { marginVertical: Spacing.xs }]}>
              The LaTeX compiler encountered an issue.
            </Text>
            {selectedVersion.errorLog && (
              <TouchableOpacity
                style={styles.toggleLogBtn}
                onPress={() => setShowErrorLog(!showErrorLog)}>
                <Text style={styles.toggleLogText}>
                  {showErrorLog ? 'Hide Logs' : 'View Error Logs'}
                </Text>
              </TouchableOpacity>
            )}
            {showErrorLog && selectedVersion.errorLog ? (
              <View style={styles.errorLogBox}>
                <Text style={styles.errorLogText}>{selectedVersion.errorLog}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* Action: Generate / Regenerate PDF Resume */}
        <Card style={styles.card}>
          <Text style={Typography.sectionTitle}>
            {selectedVersion ? 'Regenerate Resume' : 'Generate PDF Resume'}
          </Text>
          <Text style={[Typography.caption, { marginVertical: Spacing.xs }]}>
            Compiles your verified profile into ATS-compliant master LaTeX template.
          </Text>

          {isGenerating ? (
            <View style={styles.generatingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={Typography.caption}>{generationStep || 'Compiling resume...'}</Text>
            </View>
          ) : (
            <PrimaryButton
              title={selectedVersion ? 'Generate New Version' : 'Generate PDF Resume'}
              icon="file-text"
              onPress={handleGenerateResume}
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </Card>

        {/* LaTeX Source Viewer */}
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
  card: {
    marginBottom: Spacing.lg,
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
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  toggleLogBtn: {
    paddingVertical: Spacing.xs,
  },
  toggleLogText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.errorText,
  },
  errorLogBox: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  errorLogText: {
    color: '#FECACA',
    fontFamily: 'monospace',
    fontSize: 11,
  },
});
