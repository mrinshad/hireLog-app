import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog, AppToast } from '@/context/DialogContext';
import { emailRepository } from '@/database/repositories/emailRepository';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { emailComposerService } from '@/services/email/emailComposerService';
import { emailGenerator } from '@/services/gemini/emailGenerator';
import { GeminiError } from '@/services/gemini/client';
import { localPdfGenerator } from '@/services/pdf/pdfGenerator';
import { ResumeVersion } from '@/services/latex/types';
import { errorLogger } from '@/services/logging/errorLogger';
import { CustomizedResume } from '@/types/resume';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { resumeCustomizer } from '@/services/resume/resumeCustomizer';
import { workflowOrchestrator } from '@/services/workflow/workflowOrchestrator';
import { Job } from '@/types/job';
import { Profile } from '@/types/profile';

export default function EmailComposerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestResume, setLatestResume] = useState<ResumeVersion | null>(null);

  const [recipient, setRecipient] = useState('');
  const [recipientSource, setRecipientSource] = useState<'job_manual' | 'jd_extracted' | 'none'>('none');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompilingPdf, setIsCompilingPdf] = useState(false);
  const [showSentPrompt, setShowSentPrompt] = useState(false);
  const [hasOpenedEmailApp, setHasOpenedEmailApp] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [jobData, profileData, existingDraft] = await Promise.all([
          jobRepository.getJob(id),
          profileRepository.getProfile(),
          emailRepository.getDraftByJobId(id),
        ]);

        let resumeVer: ResumeVersion | null = null;
        if (jobData?.approvedResumeVersionId) {
          resumeVer = await resumeRepository.getResumeLibraryDetails(jobData.approvedResumeVersionId);
        }
        if (!resumeVer) {
          resumeVer = await resumeRepository.getLatestResumeVersion(id);
        }

        setJob(jobData);
        setProfile(profileData);
        setLatestResume(resumeVer);

        // Populate recipient
        if (existingDraft && existingDraft.recipient) {
          setRecipient(existingDraft.recipient);
        } else if (jobData) {
          const res = emailComposerService.resolveRecipient(jobData);
          setRecipient(res.recipient);
          setRecipientSource(res.source);
        }

        // Populate subject
        if (existingDraft && existingDraft.subject) {
          setSubject(existingDraft.subject);
        } else if (jobData) {
          setSubject(
            emailComposerService.formatDefaultSubject(
              jobData.role,
              profileData?.personalDetails.fullName
            )
          );
        }

        // Populate body
        if (existingDraft && existingDraft.body) {
          setBody(existingDraft.body);
        }

        // Populate signature
        if (existingDraft && existingDraft.signature) {
          setSignature(existingDraft.signature);
        } else if (profileData) {
          setSignature(emailComposerService.formatSignature(profileData));
        }

        // If email was already opened, prompt user on entry
        if (jobData?.workflowState === 'EMAIL_OPENED') {
          setShowSentPrompt(true);
        }
      } catch (error) {
        console.error('Failed to load email composer data:', error);
        AppDialog.error('Loading Error', 'Failed to load email composer.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && hasOpenedEmailApp) {
        setHasOpenedEmailApp(false);
        setShowSentPrompt(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [hasOpenedEmailApp]);

  const handleGenerateBody = async () => {
    if (!job || !profile) return;

    try {
      setIsGenerating(true);

      const matchResult =
        job.matchResult || (job.analysis ? matchingEngine.match(profile, job.analysis) : null);

      const matchedSkills = matchResult?.allMatchedSkills || [];
      const topExp = profile.experience.length > 0 ? profile.experience[0] : undefined;
      const topProj = profile.projects.length > 0 ? profile.projects[0] : undefined;

      const generatedBody = await emailGenerator.generateEmailBody({
        role: job.role,
        company: job.company,
        matchedSkills,
        topExperienceCompany: topExp?.company,
        topExperienceRole: topExp?.jobTitle,
        topProjectName: topProj?.projectName,
        topProjectDomain: topProj?.projectTypeOrDomain,
        candidateName: profile.personalDetails.fullName,
      });

      setBody(generatedBody);

      await emailRepository.saveDraft({
        jobId: job.id,
        resumeVersionId: latestResume?.id || null,
        recipient,
        subject,
        body: generatedBody,
        signature,
        resumeFilePath: latestResume?.pdfPath || null,
      });
      AppToast.show('Draft generated with Gemini', 'success');
    } catch (error: any) {
      console.error('Failed to generate email with Gemini:', error);
      AppDialog.error(
        'Generation Failed',
        error instanceof GeminiError ? error.message : 'Could not generate email body.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!job) return;
    try {
      setIsSaving(true);
      await emailRepository.saveDraft({
        jobId: job.id,
        resumeVersionId: latestResume?.id || null,
        recipient,
        subject,
        body,
        signature,
        resumeFilePath: latestResume?.pdfPath || null,
      });
      AppToast.show('Email draft saved', 'success');
    } catch (error) {
      console.error('Failed to save draft:', error);
      AppDialog.error('Save Failed', 'Failed to save email draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const getOrCompilePdfPath = async (): Promise<string | null> => {
    if (!latestResume) return null;

    let targetPath = latestResume.pdfPath;
    if (targetPath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(targetPath);
        if (fileInfo.exists) {
          return targetPath;
        }
      } catch {
        targetPath = null;
      }
    }

    try {
      setIsCompilingPdf(true);
      AppToast.show('Generating resume PDF for attachment...', 'info');

      let resumeDataToRender: CustomizedResume | null = null;
      if (latestResume.resumeJson) {
        try {
          resumeDataToRender = JSON.parse(latestResume.resumeJson) as CustomizedResume;
        } catch {}
      }

      if (!resumeDataToRender && profile && job) {
        const analysis = job.analysis || {
          company: job.company || 'Company',
          role: job.role || 'Software Engineer',
          location: job.location || null,
          experienceRequirement: null,
          educationRequirement: null,
          salary: job.salary || null,
          employmentType: null,
          workMode: null,
          applicationEmail: job.applicationEmail || null,
          applicationUrl: job.sourceUrl || null,
          requiredSkills: [],
          preferredSkills: [],
          responsibilities: [],
          otherRequirements: [],
          analyzedAt: new Date().toISOString(),
        };
        const match = job.matchResult || matchingEngine.match(profile, analysis);
        resumeDataToRender = resumeCustomizer.customize(profile, analysis, match, job.id);
      }

      if (resumeDataToRender) {
        const compiled = await localPdfGenerator.generatePdfFromResume(
          resumeDataToRender,
          job?.company || 'hireFlow',
          latestResume.versionNumber
        );

        targetPath = compiled.pdfPath;
        await resumeRepository.updateResumePdf(latestResume.id, targetPath, 'Generated');
        setLatestResume((prev) => (prev ? { ...prev, pdfPath: targetPath } : null));
        return targetPath;
      }
    } catch (err) {
      await errorLogger.logError('EmailComposer.getOrCompilePdfPath', err, {
        jobId: job?.id,
        resumeId: latestResume?.id,
      });
      console.warn('Could not generate PDF for email attachment:', err);
    } finally {
      setIsCompilingPdf(false);
    }

    return null;
  };

  const handleCompileAndSavePdf = async () => {
    if (!latestResume) return;
    try {
      setIsCompilingPdf(true);
      AppToast.show('Saving PDF document to hireFlow folder...', 'info');

      let resumeDataToRender: CustomizedResume | null = null;
      if (latestResume.resumeJson) {
        try {
          resumeDataToRender = JSON.parse(latestResume.resumeJson) as CustomizedResume;
        } catch {}
      }

      if (!resumeDataToRender && profile && job) {
        const analysis = job.analysis || {
          company: job.company || 'Company',
          role: job.role || 'Software Engineer',
          location: job.location || null,
          experienceRequirement: null,
          educationRequirement: null,
          salary: job.salary || null,
          employmentType: null,
          workMode: null,
          applicationEmail: job.applicationEmail || null,
          applicationUrl: job.sourceUrl || null,
          requiredSkills: [],
          preferredSkills: [],
          responsibilities: [],
          otherRequirements: [],
          analyzedAt: new Date().toISOString(),
        };
        const match = job.matchResult || matchingEngine.match(profile, analysis);
        resumeDataToRender = resumeCustomizer.customize(profile, analysis, match, job.id);
      }

      if (!resumeDataToRender) {
        throw new Error('Resume content is missing.');
      }

      const compiled = await localPdfGenerator.generatePdfFromResume(
        resumeDataToRender,
        job?.company || 'hireFlow',
        latestResume.versionNumber
      );

      await resumeRepository.updateResumePdf(latestResume.id, compiled.pdfPath, 'Generated');
      setLatestResume((prev) => (prev ? { ...prev, pdfPath: compiled.pdfPath } : null));
      AppToast.show('PDF saved to hireFlow/resumes/', 'success');
    } catch (err: any) {
      console.error('Error saving PDF:', err);
      AppDialog.error(
        'PDF Generation Failed',
        err.message || 'Could not generate PDF file.'
      );
    } finally {
      setIsCompilingPdf(false);
    }
  };

  const handleOpenEmailApp = async () => {
    if (!job) return;

    if (!recipient.trim()) {
      AppDialog.alert('Recipient Missing', 'Please enter an employer or recruiter email address.');
      return;
    }

    if (!body.trim()) {
      AppDialog.alert('Body Empty', 'Please enter or generate your email text before sending.');
      return;
    }

    const attachmentPath = await getOrCompilePdfPath();
    await launchEmailIntent(attachmentPath);
  };

  const launchEmailIntent = async (attachmentPath: string | null) => {
    try {
      // Save latest user edits first
      await emailRepository.saveDraft({
        jobId: job!.id,
        resumeVersionId: latestResume?.id || null,
        recipient,
        subject,
        body,
        signature,
        resumeFilePath: attachmentPath,
      });

      setHasOpenedEmailApp(true);
      await jobRepository.updateWorkflowState(job!.id, 'EMAIL_OPENED');

      await emailComposerService.openEmailApp({
        recipient,
        subject,
        body,
        signature,
        attachmentUri: attachmentPath,
      });
    } catch (error: any) {
      setHasOpenedEmailApp(false);
      await errorLogger.logError('EmailComposer.launchEmailIntent', error, {
        recipient,
        subject,
        attachmentPath,
      });
      console.error('Error opening email client:', error);
      AppDialog.error('Email App Error', error.message || 'Failed to open your email application.');
    }
  };

  const handleMarkAsApplied = async () => {
    if (!job) return;
    try {
      await workflowOrchestrator.confirmApplicationSent(job.id);
      setShowSentPrompt(false);
      AppToast.show('Application marked as Applied!', 'success');
      router.replace(`/jobs/${job.id}`);
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading email composer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Email Composer" showBack />
        <View style={styles.emptyContainer}>
          <Text style={Typography.sectionTitle}>Job Not Found</Text>
          <PrimaryButton title="Return to Jobs" icon="arrow-left" onPress={() => router.replace('/jobs')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader
          title="Email Review"
          subtitle={job.company}
          showBack
          rightAction={
            <SecondaryButton
              title="Save"
              icon="check"
              size="sm"
              loading={isSaving}
              onPress={handleSaveDraft}
            />
          }
        />

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Recipient */}
          <Card style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={Typography.caption}>To (Recipient)</Text>
              {recipientSource === 'jd_extracted' && (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>From JD</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="careers@company.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={setRecipient}
            />
          </Card>

          {/* Subject */}
          <Card style={styles.card}>
            <Text style={Typography.caption}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Application for..."
              placeholderTextColor={Colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
          </Card>

          {/* Body */}
          <Card style={styles.card}>
            <View style={styles.bodyHeaderRow}>
              <Text style={Typography.caption}>Email Body</Text>
              <TouchableOpacity
                style={styles.aiActionBtn}
                disabled={isGenerating}
                onPress={handleGenerateBody}>
                <Feather name="cpu" size={12} color={Colors.primary} />
                <Text style={styles.aiActionText}>
                  {isGenerating ? 'Generating...' : body.trim() ? 'Regenerate' : 'Draft with Gemini'}
                </Text>
              </TouchableOpacity>
            </View>

            {isGenerating ? (
              <View style={styles.generatingBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={Typography.caption}>Generating draft...</Text>
              </View>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your email body..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={body}
                onChangeText={setBody}
              />
            )}
          </Card>

          {/* Signature */}
          <Card style={styles.card}>
            <Text style={Typography.caption}>Signature</Text>
            <TextInput
              style={[styles.input, styles.signatureArea]}
              placeholder="Your signature..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={signature}
              onChangeText={setSignature}
            />
          </Card>

          {/* Attachment */}
          <Card style={styles.card}>
            <Text style={Typography.caption}>Attachment</Text>
            {latestResume ? (
              <View style={styles.attachmentBox}>
                <Feather name="file-text" size={IconSizes.md} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={Typography.itemTitle} numberOfLines={1}>
                    {latestResume.targetRole || job.role || 'Resume'} (v{latestResume.versionNumber})
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: latestResume.pdfPath ? Colors.successText : Colors.primary },
                    ]}>
                    {latestResume.pdfPath ? 'PDF ready in hireFlow' : 'Tailored resume attached'}
                  </Text>
                </View>
                {!latestResume.pdfPath && (
                  <SecondaryButton
                    title="Save PDF"
                    icon="download"
                    size="sm"
                    loading={isCompilingPdf}
                    onPress={handleCompileAndSavePdf}
                  />
                )}
              </View>
            ) : (
              <View style={styles.missingAttachmentBox}>
                <Feather name="alert-circle" size={IconSizes.sm} color={Colors.warningText} />
                <Text style={[Typography.caption, { color: Colors.warningText, flex: 1 }]}>
                  No tailored resume created yet.
                </Text>
                <TouchableOpacity onPress={() => router.push(`/jobs/resume/${job.id}`)}>
                  <Text style={styles.linkText}>Create Resume →</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Open Email Application Button */}
          <PrimaryButton
            title="Open in Email App"
            icon="mail"
            size="lg"
            onPress={handleOpenEmailApp}
            style={styles.openBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* In-App Confirmation Modal when returning from external email app */}
      {showSentPrompt && (
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={Typography.sectionTitle}>Application Check</Text>
            <Text style={[Typography.body, { marginVertical: Spacing.sm }]}>
              Did you submit the email application to {job.company || 'the employer'}?
            </Text>
            <View style={styles.modalActionRow}>
              <PrimaryButton
                title="Yes, Mark as Applied"
                icon="check"
                size="sm"
                onPress={handleMarkAsApplied}
                style={{ flex: 1 }}
              />
              <SecondaryButton
                title="Not Yet"
                size="sm"
                onPress={() => setShowSentPrompt(false)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
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
  gateBannerCard: {
    marginBottom: Spacing.md,
    borderColor: Colors.primaryBorder,
  },
  card: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  bodyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  aiActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  textArea: {
    minHeight: 120,
    lineHeight: 20,
  },
  signatureArea: {
    minHeight: 80,
    lineHeight: 18,
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  missingAttachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  openBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
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
    maxWidth: 340,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
