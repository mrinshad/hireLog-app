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

import { emailRepository } from '@/database/repositories/emailRepository';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { emailComposerService } from '@/services/email/emailComposerService';
import { emailGenerator } from '@/services/gemini/emailGenerator';
import { GeminiError } from '@/services/gemini/client';
import { ResumeVersion } from '@/services/latex/types';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { EmailDraft } from '@/types/email';
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

  // Listen for AppState changes to detect return from external email client
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

      // Collect minimal context for Gemini
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

      // Save draft automatically
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
      Alert.alert('Draft Saved', 'Your email draft has been saved locally.');
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
      Alert.alert(
        'Recipient Missing',
        'Please enter a recipient email address before sending.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!body.trim()) {
      Alert.alert('Body Empty', 'Please enter or generate an email body first.');
      return;
    }

    if (!latestResume?.pdfPath) {
      Alert.alert(
        'Resume Attachment Missing',
        'No compiled PDF resume found for this job. Would you like to generate the resume first or proceed without an attachment?',
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
      // Save latest edits first
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
      await jobRepository.updateJob(job.id, { status: 'Applied' });
      setShowSentPrompt(false);
      Alert.alert('Application Updated', 'Job marked as Applied!', [
        { text: 'View Job Details', onPress: () => router.replace(`/jobs/${job.id}`) },
      ]);
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Email Composer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Email Composer
          </Text>
          <TouchableOpacity onPress={handleSaveDraft} style={styles.saveHeaderBtn}>
            <Text style={styles.saveHeaderText}>{isSaving ? '...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Hero Job Info Card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroRole}>{job.role || 'Job Application'}</Text>
            <Text style={styles.heroCompany}>{job.company || 'Company'}</Text>
          </View>

          {/* Recipient Field */}
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>To (Recipient Email)</Text>
              {recipientSource === 'jd_extracted' && (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>From JD</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="hr@company.com or hiring@company.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={setRecipient}
            />
            {!recipient.trim() && (
              <Text style={styles.missingHint}>
                ⚠️ Application email not available from JD. Please enter one manually.
              </Text>
            )}
          </View>

          {/* Subject Field */}
          <View style={styles.card}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Application for..."
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Email Body Card */}
          <View style={styles.card}>
            <View style={styles.bodyHeaderRow}>
              <Text style={styles.label}>Email Body</Text>
              <TouchableOpacity
                style={styles.aiActionBtn}
                disabled={isGenerating}
                onPress={handleGenerateBody}>
                <Text style={styles.aiActionText}>
                  {isGenerating ? 'Generating...' : body.trim() ? '↻ Regenerate' : '✨ Generate with Gemini'}
                </Text>
              </TouchableOpacity>
            </View>

            {isGenerating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.generatingText}>Crafting concise application email...</Text>
              </View>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your email body or tap 'Generate with Gemini'..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={7}
                textAlignVertical="top"
                value={body}
                onChangeText={setBody}
              />
            )}
          </View>

          {/* Signature Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Signature (from Profile)</Text>
            <TextInput
              style={[styles.input, styles.signatureArea]}
              placeholder="Your contact details..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={signature}
              onChangeText={setSignature}
            />
          </View>

          {/* Resume Attachment Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Attachment</Text>
            {latestResume?.pdfPath ? (
              <View style={styles.attachmentBox}>
                <View style={styles.attachmentIconCircle}>
                  <Text style={styles.attachmentIcon}>📄</Text>
                </View>
                <View style={styles.attachmentDetails}>
                  <Text style={styles.attachmentName}>
                    {latestResume.targetRole || 'Resume'} (v{latestResume.versionNumber}.pdf)
                  </Text>
                  <Text style={styles.attachmentStatus}>✓ Verified on-device PDF attached</Text>
                </View>
              </View>
            ) : (
              <View style={styles.missingAttachmentBox}>
                <Text style={styles.missingAttachmentText}>
                  ⚠️ No compiled resume PDF found for this job.
                </Text>
                <TouchableOpacity
                  style={styles.compileResumeLinkBtn}
                  onPress={() => router.push(`/jobs/resume/${job.id}`)}>
                  <Text style={styles.compileResumeLinkText}>Compile PDF Resume →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Primary Action: Open in External Email Client */}
          <TouchableOpacity
            style={styles.openAppBtn}
            activeOpacity={0.8}
            onPress={handleOpenEmailApp}>
            <Text style={styles.openAppBtnText}>🚀 Open in Email Application</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Modal when returning from external email app */}
      {showSentPrompt && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Application Check</Text>
            <Text style={styles.modalSubtext}>
              Did you send this job application email to {job.company || 'the employer'}?
            </Text>
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalAppliedBtn}
                onPress={handleMarkAsApplied}>
                <Text style={styles.modalAppliedText}>✓ Yes, Mark as Applied</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalNotYetBtn}
                onPress={() => setShowSentPrompt(false)}>
                <Text style={styles.modalNotYetText}>Not Yet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
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
  saveHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  saveHeaderText: {
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
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 16,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  sourceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 140,
    lineHeight: 20,
  },
  signatureArea: {
    minHeight: 80,
    lineHeight: 18,
  },
  missingHint: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 6,
  },
  bodyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  generatingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10,
  },
  generatingText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
  },
  attachmentIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attachmentIcon: {
    fontSize: 18,
  },
  attachmentDetails: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  attachmentStatus: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  missingAttachmentBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
  },
  missingAttachmentText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 8,
  },
  compileResumeLinkBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  compileResumeLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  openAppBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  openAppBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActionRow: {
    width: '100%',
    gap: 10,
  },
  modalAppliedBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalAppliedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalNotYetBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalNotYetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});
