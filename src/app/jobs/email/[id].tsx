import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { emailRepository } from '@/database/repositories/emailRepository';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { emailComposerService } from '@/services/email/emailComposerService';
import { emailGenerator } from '@/services/gemini/emailGenerator';
import { GeminiError } from '@/services/gemini/client';
import { ResumeVersion } from '@/services/latex/types';
import { matchingEngine } from '@/services/matching/matchingEngine';
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
  const [showSentPrompt, setShowSentPrompt] = useState(false);
  const [hasOpenedEmailApp, setHasOpenedEmailApp] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [jobData, profileData, resumeVer, existingDraft] = await Promise.all([
          jobRepository.getJob(id),
          profileRepository.getProfile(),
          resumeRepository.getLatestResumeVersion(id),
          emailRepository.getDraftByJobId(id),
        ]);

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
      } catch (error) {
        console.error('Failed to load email composer data:', error);
        Alert.alert('Error', 'Failed to load email composer.');
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

      const matchResult = job.analysis
        ? matchingEngine.match(profile, job.analysis)
        : null;

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
    } catch (error: any) {
      console.error('Failed to generate email with Gemini:', error);
      Alert.alert(
        'Email Generation Failed',
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
      Alert.alert('Saved', 'Draft saved locally.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Error', 'Failed to save email draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEmailApp = async () => {
    if (!job) return;

    if (!recipient.trim()) {
      Alert.alert('Recipient Missing', 'Please enter a recipient email address.');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Body Empty', 'Please enter or generate an email body first.');
      return;
    }

    if (!latestResume?.pdfPath) {
      Alert.alert(
        'Resume Attachment Missing',
        'No compiled PDF resume found for this job. Generate the resume first or proceed without attachment?',
        [
          { text: 'Generate Resume', onPress: () => router.push(`/jobs/resume/${job.id}`) },
          {
            text: 'Send Without Attachment',
            style: 'destructive',
            onPress: () => launchEmailIntent(null),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    await launchEmailIntent(latestResume.pdfPath);
  };

  const launchEmailIntent = async (attachmentPath: string | null) => {
    try {
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

      await emailComposerService.openEmailApp({
        recipient,
        subject,
        body,
        signature,
        attachmentUri: attachmentPath,
      });
    } catch (error: any) {
      setHasOpenedEmailApp(false);
      console.error('Error opening email client:', error);
      Alert.alert('Error', error.message || 'Failed to open email application.');
    }
  };

  const handleMarkAsApplied = async () => {
    if (!job) return;
    try {
      await jobRepository.updateJobStatus(job.id, 'Applied');
      setShowSentPrompt(false);
      Alert.alert('Updated', 'Job marked as Applied!', [
        { text: 'View Job', onPress: () => router.replace(`/jobs/${job.id}`) },
      ]);
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading composer...</Text>
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
          title="Email Composer"
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
            {latestResume?.pdfPath ? (
              <View style={styles.attachmentBox}>
                <Feather name="file-text" size={IconSizes.md} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={Typography.itemTitle} numberOfLines={1}>
                    {latestResume.targetRole || 'Resume'} (v{latestResume.versionNumber}.pdf)
                  </Text>
                  <Text style={[Typography.caption, { color: Colors.successText }]}>
                    Attached from local storage
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.missingAttachmentBox}>
                <Feather name="alert-circle" size={IconSizes.sm} color={Colors.warningText} />
                <Text style={[Typography.caption, { color: Colors.warningText, flex: 1 }]}>
                  No PDF resume compiled yet.
                </Text>
                <TouchableOpacity onPress={() => router.push(`/jobs/resume/${job.id}`)}>
                  <Text style={styles.linkText}>Compile →</Text>
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

      {/* Confirmation Modal */}
      {showSentPrompt && (
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={Typography.sectionTitle}>Application Check</Text>
            <Text style={[Typography.body, { marginVertical: Spacing.sm }]}>
              Did you send this application email?
            </Text>
            <View style={styles.modalActionRow}>
              <PrimaryButton
                title="Mark as Applied"
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
