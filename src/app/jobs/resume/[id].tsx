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

      // Load Profile & build CustomizedResume
      const profile = await profileRepository.getProfile();
      const matchResult = matchingEngine.match(profile, jobData.analysis);
      const tailored = resumeCustomizer.customize(
        profile,
        jobData.analysis,
        matchResult,
        jobData.id
      );
      setCustomizedResume(tailored);

      // Load existing versions
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

      // Step 0: Validate resume against Profile source of truth
      setGenerationStep('Validating resume against Profile...');
      const profile = await profileRepository.getProfile();
      resumeValidator.validate(profile, customizedResume);

      // Step 1: Render LaTeX source
      setGenerationStep('Generating LaTeX markup...');
      const latexSource = latexRenderer.render(customizedResume);

      // Step 2: Save initial version in SQLite (Pending status)
      setGenerationStep('Creating resume record...');
      const newVersion = await resumeRepository.saveResumeVersion(
        job.id,
        customizedResume,
        latexSource,
        null,
        'Compiling'
      );

      // Step 3: Compile LaTeX to PDF
      setGenerationStep('Compiling LaTeX to PDF...');
      try {
        const compileResult = await latexCompiler.compileToPdf(
          latexSource,
          job.id,
          newVersion.id
        );

        // Step 4: Update SQLite with PDF path & Generated status
        setGenerationStep('Saving PDF to device...');
        await resumeRepository.updateResumePdf(
          newVersion.id,
          compileResult.pdfPath,
          'Generated',
          null
        );

        newVersion.pdfPath = compileResult.pdfPath;
        newVersion.generationStatus = 'Generated';

        // Refresh versions list
        const updatedVersions = await resumeRepository.getResumeVersions(job.id);
        setVersions(updatedVersions);
        setSelectedVersion(newVersion);

        Alert.alert(
          'Resume Generated',
          `PDF Resume (v${newVersion.versionNumber}) is compiled and saved locally!`
        );
      } catch (compileErr: any) {
        console.error('PDF compilation failed:', compileErr);
        const errorLog =
          compileErr instanceof CompilerError
            ? compileErr.compilerLog
            : String(compileErr);

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
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading resume preview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job || !customizedResume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resume Preview</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>JD Analysis Required</Text>
          <Text style={styles.emptySubtext}>
            Please analyze the Job Description first before generating LaTeX source.
          </Text>
          <TouchableOpacity style={styles.returnBtn} onPress={() => router.back()}>
            <Text style={styles.returnBtnText}>Return</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Customize</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          PDF Resume Preview
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Job & Target Info Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleArea}>
              <Text style={styles.heroRole}>{customizedResume.targetRole}</Text>
              <Text style={styles.heroCompany}>{customizedResume.targetCompany}</Text>
            </View>
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{customizedResume.overallMatchScore}% Match</Text>
            </View>
          </View>
          <Text style={styles.heroSubtext}>
            ATS-compliant PDF resume generated directly from your verified Profile.
          </Text>
        </View>

        {/* Version History Selector */}
        {versions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📑 Resume Versions ({versions.length})</Text>
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
          </View>
        )}

        {/* Active PDF Status & Actions */}
        {selectedVersion?.generationStatus === 'Generated' && selectedVersion.pdfPath ? (
          <View style={styles.readyCard}>
            <View style={styles.readyHeaderRow}>
              <View style={styles.readyTitleArea}>
                <Text style={styles.readyTitle}>✓ PDF Resume Ready</Text>
                <Text style={styles.readySubtext}>
                  Version v{selectedVersion.versionNumber} saved to on-device storage.
                </Text>
              </View>
              <View style={styles.pdfBadge}>
                <Text style={styles.pdfBadgeText}>PDF</Text>
              </View>
            </View>

            <View style={styles.primaryActionRow}>
              <TouchableOpacity
                style={styles.openPdfBtn}
                activeOpacity={0.8}
                onPress={handleOpenPdf}>
                <Text style={styles.openPdfBtnText}>👁️ Preview / Open PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sharePdfBtn}
                activeOpacity={0.8}
                onPress={handleOpenPdf}>
                <Text style={styles.sharePdfBtnText}>📤 Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.composeEmailBtn}
              activeOpacity={0.8}
              onPress={() => router.push(`/jobs/email/${job.id}`)}>
              <Text style={styles.composeEmailBtnText}>✉️ Compose Application Email →</Text>
            </TouchableOpacity>
          </View>
        ) : selectedVersion?.generationStatus === 'Failed' ? (
          <View style={styles.failedCard}>
            <Text style={styles.failedTitle}>✕ PDF Generation Failed</Text>
            <Text style={styles.failedSubtext}>
              The LaTeX compiler encountered an issue. You can review the error log below or try again.
            </Text>
            {selectedVersion.errorLog && (
              <TouchableOpacity
                style={styles.toggleLogBtn}
                onPress={() => setShowErrorLog(!showErrorLog)}>
                <Text style={styles.toggleLogText}>
                  {showErrorLog ? '▲ Hide Compiler Logs' : '▼ View Compiler Error Logs'}
                </Text>
              </TouchableOpacity>
            )}
            {showErrorLog && selectedVersion.errorLog ? (
              <View style={styles.errorLogBox}>
                <Text style={styles.errorLogText}>{selectedVersion.errorLog}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Action: Generate / Regenerate PDF Resume */}
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>
            {selectedVersion ? '⚡ Regenerate or Update' : '🚀 Ready to Generate PDF'}
          </Text>
          <Text style={styles.actionCardSubtext}>
            {selectedVersion
              ? 'Regenerating will compile the latest Profile details into a new version without overwriting existing ones.'
              : 'Compile your selected skills, experience, and projects into a professional PDF document.'}
          </Text>

          {isGenerating ? (
            <View style={styles.generatingBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.generatingText}>{generationStep || 'Compiling resume...'}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.generateBtn}
              activeOpacity={0.8}
              onPress={handleGenerateResume}>
              <Text style={styles.generateBtnText}>
                {selectedVersion
                  ? '↻ Generate New Version'
                  : '✨ Generate PDF Resume'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LaTeX Source Viewer */}
        {selectedVersion ? (
          <View style={styles.card}>
            <View style={styles.codeHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  LaTeX Source (v{selectedVersion.versionNumber})
                </Text>
                <Text style={styles.codeDate}>
                  Generated on{' '}
                  {new Date(selectedVersion.createdAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                onPress={handleCopyLatex}>
                <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                  {isCopied ? '✓ Copied' : '📋 Copy Source'}
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
          </View>
        ) : (
          /* Pre-Generation Summary Review */
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📋 Content to be Compiled</Text>
            <View style={styles.previewList}>
              <View style={styles.previewItem}>
                <Text style={styles.previewKey}>Candidate Name:</Text>
                <Text style={styles.previewVal}>
                  {customizedResume.personalDetails.fullName || 'Not specified'}
                </Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewKey}>Selected Skills:</Text>
                <Text style={styles.previewVal}>{customizedResume.skills.length} skills</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewKey}>Selected Experience:</Text>
                <Text style={styles.previewVal}>{customizedResume.experience.length} entries</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewKey}>Selected Projects:</Text>
                <Text style={styles.previewVal}>{customizedResume.projects.length} projects</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewKey}>Education:</Text>
                <Text style={styles.previewVal}>{customizedResume.education.length} entries</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewKey}>Certifications:</Text>
                <Text style={styles.previewVal}>
                  {customizedResume.certifications.length} credentials
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Local Storage & Sharing Notice */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Persistent Local Storage</Text>
          <Text style={styles.infoText}>
            Generated PDF resumes and LaTeX source code are stored permanently on your device in SQLite and the file system. They remain accessible even after restarting the app.
          </Text>
        </View>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  versionChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  versionChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  versionChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  versionChipFailed: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  versionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  versionChipTextSelected: {
    color: '#FFFFFF',
  },
  readyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 16,
    marginBottom: 16,
  },
  readyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  readyTitleArea: {
    flex: 1,
    marginRight: 10,
  },
  readyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  readySubtext: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  pdfBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pdfBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  openPdfBtn: {
    flex: 2,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  openPdfBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sharePdfBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sharePdfBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  composeEmailBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  composeEmailBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  failedCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    marginBottom: 16,
  },
  failedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  failedSubtext: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
    marginBottom: 10,
  },
  toggleLogBtn: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  toggleLogText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorLogBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    maxHeight: 180,
  },
  errorLogText: {
    color: '#F87171',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionCardSubtext: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 14,
  },
  generatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  generateBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  codeDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  copyBtnTextSuccess: {
    color: '#16A34A',
  },
  codeBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    maxHeight: 280,
  },
  codeScroll: {
    flexGrow: 0,
  },
  codeScrollContent: {
    paddingBottom: 8,
  },
  codeText: {
    color: '#E2E8F0',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  previewList: {
    marginTop: 10,
    gap: 8,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewKey: {
    fontSize: 13,
    color: '#64748B',
  },
  previewVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 14,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#2563EB',
    lineHeight: 18,
  },
});
