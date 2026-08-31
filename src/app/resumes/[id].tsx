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
import { DestructiveButton, PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { ResumeDocumentSheet } from '@/components/resume/ResumeDocumentSheet';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog, AppToast } from '@/context/DialogContext';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { ResumeVersion } from '@/services/latex/types';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
import { JobStatus } from '@/types/job';
import { CustomizedResume } from '@/types/resume';

export default function ResumeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [resumeVersion, setResumeVersion] = useState<
    (ResumeVersion & { jobStatus?: JobStatus | null; isApproved?: boolean }) | null
  >(null);
  const [parsedResume, setParsedResume] = useState<CustomizedResume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showLatexCode, setShowLatexCode] = useState(false);

  const loadResumeDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await resumeRepository.getResumeLibraryDetails(id);
      setResumeVersion(data);

      if (data && data.resumeJson) {
        try {
          const parsed = JSON.parse(data.resumeJson) as CustomizedResume;
          setParsedResume(parsed);
        } catch {
          setParsedResume(null);
        }
      }
    } catch (error) {
      console.error('Failed to load resume details:', error);
      AppDialog.error('Loading Error', 'Failed to load resume details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResumeDetails();
  }, [id]);

  const handleOpenWith = async () => {
    if (!resumeVersion?.pdfPath) {
      AppDialog.alert('PDF Not Available', 'PDF file has not been compiled yet.');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        AppDialog.alert(
          'App Selector Unavailable',
          'Document viewing is not available on this platform.'
        );
        return;
      }

      await Sharing.shareAsync(resumeVersion.pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Open With...',
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      AppDialog.error('Viewer Error', 'Failed to open PDF document.');
    }
  };

  const handleCopyLatex = async () => {
    if (!resumeVersion) return;
    try {
      await Clipboard.setStringAsync(resumeVersion.latexSource);
      setIsCopied(true);
      AppToast.show('LaTeX copied to clipboard', 'info');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      AppDialog.error('Copy Error', 'Failed to copy LaTeX source.');
    }
  };

  const handleDelete = () => {
    if (!resumeVersion) return;

    AppDialog.confirm(
      'Delete Resume Version',
      `Delete version v${resumeVersion.versionNumber} for ${resumeVersion.targetCompany}? The job application will remain.`,
      async () => {
        try {
          await resumeRepository.deleteResumeVersion(resumeVersion.id);
          AppToast.show('Resume version removed', 'info');
          router.replace('/resumes');
        } catch (error) {
          console.error('Failed to delete resume version:', error);
          AppDialog.error('Delete Failed', 'Failed to delete resume version.');
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
          <PrimaryButton title="Return to Library" icon="arrow-left" onPress={() => router.replace('/resumes')} />
        </View>
      </SafeAreaView>
    );
  }

  const isSuccess = resumeVersion.generationStatus === 'Generated' && !!resumeVersion.pdfPath;

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
                {resumeVersion.targetRole || 'Tailored Resume'}
              </Text>
              <Text style={[Typography.itemTitle, { color: Colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {resumeVersion.targetCompany || 'Company'}
              </Text>
            </View>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{resumeVersion.versionNumber}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={Typography.caption}>
              Created {formatRelativeDate(resumeVersion.createdAt)}
            </Text>
            <Text style={styles.templateTag}>{resumeVersion.templateVersion || 'master-v1'}</Text>
          </View>

          <View style={styles.statusRow}>
            {resumeVersion.isApproved && (
              <View style={styles.approvedPill}>
                <Feather name="check" size={12} color={Colors.successText} />
                <Text style={styles.approvedPillText}>Approved for Application</Text>
              </View>
            )}

            {resumeVersion.jobStatus && (
              <View style={styles.jobStatusArea}>
                <Text style={Typography.caption}>Job Status: </Text>
                <StatusBadge status={resumeVersion.jobStatus} size="sm" />
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {isSuccess && (
              <PrimaryButton
                title="Open With"
                icon="external-link"
                size="md"
                onPress={handleOpenWith}
                style={{ flex: 1 }}
              />
            )}
            <SecondaryButton
              title={showLatexCode ? 'Hide LaTeX' : 'View LaTeX'}
              icon="code"
              size="md"
              onPress={() => setShowLatexCode(!showLatexCode)}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* =========================================================================
            IN-APP VISUAL RESUME DOCUMENT SHEET
            ========================================================================= */}
        {parsedResume ? (
          <View style={styles.documentContainer}>
            <View style={styles.documentLabelRow}>
              <Feather name="file-text" size={14} color={Colors.textSecondary} />
              <Text style={Typography.sectionTitle}>Resume Document Preview</Text>
            </View>
            <ResumeDocumentSheet resume={parsedResume} />
          </View>
        ) : null}

        {/* Associated Job Link Card */}
        {resumeVersion.jobId && (
          <Card style={styles.card}>
            <View style={styles.jobLinkRow}>
              <View style={{ flex: 1 }}>
                <Text style={Typography.sectionTitle}>Target Application</Text>
                <Text style={[Typography.caption, { marginTop: 2 }]}>
                  View and manage the full job application pipeline.
                </Text>
              </View>
              <SecondaryButton
                title="View Job"
                icon="arrow-right"
                size="sm"
                onPress={() => router.push(`/jobs/${resumeVersion.jobId}`)}
              />
            </View>
          </Card>
        )}

        {/* LaTeX Source Inspector (Collapsible) */}
        {showLatexCode && (
          <Card style={styles.card}>
            <View style={styles.latexHeaderRow}>
              <Text style={Typography.sectionTitle}>LaTeX Source</Text>
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
                  {resumeVersion.latexSource}
                </Text>
              </ScrollView>
            </View>
          </Card>
        )}

        {/* Delete Version */}
        <DestructiveButton
          title="Delete Resume Version"
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
    gap: Spacing.md,
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
    gap: Spacing.md,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateTag: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  approvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  approvedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successText,
  },
  jobStatusArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  documentContainer: {
    gap: Spacing.sm,
  },
  documentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    gap: Spacing.sm,
  },
  jobLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
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
    marginTop: Spacing.sm,
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
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
});
