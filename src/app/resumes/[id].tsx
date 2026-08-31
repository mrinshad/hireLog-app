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
import { DestructiveButton, PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { ResumeVersion } from '@/services/latex/types';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
import { JobStatus } from '@/types/job';
import { CustomizedResume } from '@/types/resume';

export default function ResumeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [resumeVersion, setResumeVersion] = useState<
    (ResumeVersion & { jobStatus?: JobStatus | null }) | null
  >(null);
  const [parsedResume, setParsedResume] = useState<CustomizedResume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showLatex, setShowLatex] = useState(false);

  const loadResumeDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await resumeRepository.getResumeLibraryDetails(id);
      setResumeVersion(data);

      if (data?.resumeJson) {
        try {
          const parsed = JSON.parse(data.resumeJson) as CustomizedResume;
          setParsedResume(parsed);
        } catch {
          setParsedResume(null);
        }
      }
    } catch (error) {
      console.error('Failed to load resume details:', error);
      Alert.alert('Error', 'Failed to load resume details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResumeDetails();
  }, [id]);

  const handleOpenPdf = async () => {
    if (!resumeVersion?.pdfPath) {
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

      await Sharing.shareAsync(resumeVersion.pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Resume - ${resumeVersion.targetRole}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Failed to open PDF file.');
    }
  };

  const handleCopyLatex = async () => {
    if (!resumeVersion) return;
    try {
      await Clipboard.setStringAsync(resumeVersion.latexSource);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy LaTeX source.');
    }
  };

  const handleDelete = () => {
    if (!resumeVersion) return;

    Alert.alert(
      'Delete Resume Version?',
      `Are you sure you want to delete version v${resumeVersion.versionNumber} for ${resumeVersion.targetCompany}? The associated Job posting and Profile will NOT be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await resumeRepository.deleteResumeVersion(resumeVersion.id);
              router.replace('/resumes');
            } catch (error) {
              console.error('Failed to delete resume version:', error);
              Alert.alert('Error', 'Failed to delete resume version.');
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
          <Text style={Typography.caption}>Loading resume details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!resumeVersion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Resume Details" showBack />
        <View style={styles.emptyContainer}>
          <Text style={Typography.sectionTitle}>Resume Not Found</Text>
          <PrimaryButton
            title="Return to Library"
            icon="arrow-left"
            onPress={() => router.replace('/resumes')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isPdfReady = resumeVersion.generationStatus === 'Generated' && !!resumeVersion.pdfPath;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`Resume v${resumeVersion.versionNumber}`}
        subtitle={resumeVersion.targetCompany}
        showBack
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleArea}>
              <Text style={Typography.screenTitle} numberOfLines={1}>
                {resumeVersion.targetRole || 'Software Professional'}
              </Text>
              <Text style={[Typography.itemTitle, { color: Colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {resumeVersion.targetCompany || 'Company not specified'}
              </Text>
            </View>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{resumeVersion.versionNumber}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={Typography.caption}>Generated</Text>
              <Text style={Typography.bodyMedium}>
                {new Date(resumeVersion.createdAt).toLocaleDateString()} ({formatRelativeDate(resumeVersion.createdAt)})
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={Typography.caption}>Template</Text>
              <Text style={[Typography.bodyMedium, styles.monoText]}>
                {resumeVersion.templateVersion || 'master-v1'}
              </Text>
            </View>
          </View>

          {resumeVersion.jobStatus && (
            <View style={styles.applicationStatusRow}>
              <Text style={Typography.caption}>Application Stage:</Text>
              <StatusBadge status={resumeVersion.jobStatus} size="sm" />
              <TouchableOpacity
                style={styles.openJobLink}
                onPress={() => router.push(`/jobs/${resumeVersion.jobId}`)}>
                <Text style={styles.openJobLinkText}>View Job</Text>
                <Feather name="chevron-right" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* PDF Actions */}
        <Card style={styles.card}>
          <Text style={Typography.sectionTitle}>PDF Document</Text>
          {isPdfReady ? (
            <>
              <View style={styles.pdfReadyRow}>
                <Feather name="check-circle" size={IconSizes.sm} color={Colors.successText} />
                <Text style={styles.pdfReadyText}>Compiled and ready on device</Text>
              </View>

              <View style={styles.pdfActionsRow}>
                <PrimaryButton
                  title="Preview PDF"
                  icon="eye"
                  onPress={handleOpenPdf}
                  style={styles.flexBtn}
                />
                <SecondaryButton
                  title="Share"
                  icon="share-2"
                  onPress={handleOpenPdf}
                  style={styles.flexBtn}
                />
              </View>
            </>
          ) : (
            <View style={styles.pdfUnavailableBox}>
              <Text style={styles.pdfUnavailableTitle}>PDF Not Available</Text>
              <Text style={Typography.caption}>
                {resumeVersion.generationStatus === 'Failed'
                  ? 'PDF compilation failed for this version.'
                  : 'PDF has not been compiled yet.'}
              </Text>
              <PrimaryButton
                title="Open Job Resume Screen"
                icon="file-text"
                size="sm"
                onPress={() => router.push(`/jobs/resume/${resumeVersion.jobId}`)}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}
        </Card>

        {/* Snapshot Summary */}
        {parsedResume && (
          <Card style={styles.card}>
            <Text style={Typography.sectionTitle}>Stored Version Snapshot</Text>
            <View style={styles.contentGrid}>
              <View style={styles.contentRow}>
                <Text style={Typography.caption}>Candidate</Text>
                <Text style={Typography.bodyMedium}>
                  {parsedResume.personalDetails?.fullName || 'Candidate'}
                </Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={Typography.caption}>Skills Selected</Text>
                <Text style={Typography.bodyMedium}>{parsedResume.skills?.length || 0} skills</Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={Typography.caption}>Experience</Text>
                <Text style={Typography.bodyMedium}>{parsedResume.experience?.length || 0} positions</Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={Typography.caption}>Projects</Text>
                <Text style={Typography.bodyMedium}>{parsedResume.projects?.length || 0} projects</Text>
              </View>
            </View>
          </Card>
        )}

        {/* LaTeX Source Inspector */}
        <Card style={styles.card}>
          <View style={styles.latexHeaderRow}>
            <TouchableOpacity
              style={styles.latexToggleBtn}
              onPress={() => setShowLatex(!showLatex)}>
              <Feather name={showLatex ? 'chevron-up' : 'chevron-down'} size={IconSizes.sm} color={Colors.primary} />
              <Text style={styles.latexToggleText}>
                {showLatex ? 'Hide LaTeX Source' : 'View LaTeX Source'}
              </Text>
            </TouchableOpacity>

            {showLatex && (
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
            )}
          </View>

          {showLatex && (
            <View style={styles.codeBox}>
              <ScrollView
                nestedScrollEnabled
                style={styles.codeScroll}
                contentContainerStyle={styles.codeScrollContent}>
                <Text style={styles.codeText} selectable>
                  {resumeVersion.latexSource}
                </Text>
              </ScrollView>
            </View>
          )}
        </Card>

        {/* Delete */}
        <DestructiveButton
          title="Delete This Version"
          onPress={handleDelete}
          style={styles.deleteBtn}
        />
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
  versionBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaCol: {
    flex: 1,
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  applicationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  openJobLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
  },
  openJobLinkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  card: {
    marginBottom: Spacing.lg,
  },
  pdfReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.md,
  },
  pdfReadyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.successText,
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
  pdfUnavailableBox: {
    backgroundColor: Colors.errorBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.sm,
  },
  pdfUnavailableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.errorText,
    marginBottom: 2,
  },
  contentGrid: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  latexHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  latexToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  latexToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
  deleteBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
});
