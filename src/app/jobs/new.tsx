import React, { useState } from 'react';
import {
  Alert,
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
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/Buttons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { jobRepository } from '@/database/repositories/jobRepository';
import { JOB_STATUSES, JobStatus } from '@/types/job';

export default function NewJobScreen() {
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [salary, setSalary] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [status, setStatus] = useState<JobStatus>('Draft');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!jobDescription.trim()) {
      newErrors.jobDescription = 'Job Description is required.';
    }
    if (
      applicationEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicationEmail.trim())
    ) {
      newErrors.applicationEmail = 'Please enter a valid email address.';
    }
    if (
      sourceUrl.trim() &&
      !/^https?:\/\/.+/i.test(sourceUrl.trim())
    ) {
      newErrors.sourceUrl = 'Please enter a valid URL.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      const newJob = await jobRepository.createJob({
        jobDescription: jobDescription.trim(),
        role: role.trim(),
        company: company.trim(),
        location: location.trim(),
        applicationEmail: applicationEmail.trim() || undefined,
        salary: salary.trim() || undefined,
        source: source.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        status,
      });

      router.replace(`/jobs/${newJob.id}`);
    } catch (error) {
      console.error('Failed to create job:', error);
      Alert.alert('Error', 'Failed to save job to local storage.');
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader
          title="New Application"
          showBack
          rightAction={
            <PrimaryButton
              title="Save"
              icon="check"
              size="sm"
              loading={isSaving}
              onPress={handleSave}
            />
          }
        />

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Focal Input: Job Description */}
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={Typography.sectionTitle}>
                Job Description <Text style={styles.required}>*</Text>
              </Text>
              <Text style={Typography.caption}>{jobDescription.length} chars</Text>
            </View>
            <TextInput
              style={[
                styles.textArea,
                errors.jobDescription ? styles.inputError : null,
              ]}
              placeholder="Paste complete Job Description here..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              value={jobDescription}
              onChangeText={(text) => {
                setJobDescription(text);
                if (errors.jobDescription) setErrors((p) => ({ ...p, jobDescription: '' }));
              }}
            />
            {errors.jobDescription ? (
              <Text style={styles.errorText}>{errors.jobDescription}</Text>
            ) : null}
          </Card>

          {/* Job Status Selector */}
          <Card style={styles.card}>
            <Text style={Typography.sectionTitle}>Application Status</Text>
            <View style={styles.statusChips}>
              {JOB_STATUSES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.chip, status === st && styles.chipActive]}
                  onPress={() => setStatus(st)}>
                  <Text style={[styles.chipText, status === st && styles.chipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Details Card */}
          <Card style={styles.card}>
            <Text style={Typography.sectionTitle}>Details (Optional)</Text>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Role / Job Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Senior Frontend Engineer"
                placeholderTextColor={Colors.textMuted}
                value={role}
                onChangeText={setRole}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Company</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={Colors.textMuted}
                value={company}
                onChangeText={setCompany}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Remote, San Francisco"
                placeholderTextColor={Colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Application Email</Text>
              <TextInput
                style={[styles.input, errors.applicationEmail && styles.inputError]}
                placeholder="e.g. careers@company.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={applicationEmail}
                onChangeText={(text) => {
                  setApplicationEmail(text);
                  if (errors.applicationEmail) setErrors((p) => ({ ...p, applicationEmail: '' }));
                }}
              />
              {errors.applicationEmail ? (
                <Text style={styles.errorText}>{errors.applicationEmail}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Salary</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. $140,000"
                placeholderTextColor={Colors.textMuted}
                value={salary}
                onChangeText={setSalary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.col]}>
                <Text style={Typography.caption}>Source</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. LinkedIn"
                  placeholderTextColor={Colors.textMuted}
                  value={source}
                  onChangeText={setSource}
                />
              </View>

              <View style={[styles.inputGroup, styles.col]}>
                <Text style={Typography.caption}>Source URL</Text>
                <TextInput
                  style={[styles.input, errors.sourceUrl && styles.inputError]}
                  placeholder="https://..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  value={sourceUrl}
                  onChangeText={(text) => {
                    setSourceUrl(text);
                    if (errors.sourceUrl) setErrors((p) => ({ ...p, sourceUrl: '' }));
                  }}
                />
              </View>
            </View>
            {errors.sourceUrl ? <Text style={styles.errorText}>{errors.sourceUrl}</Text> : null}
          </Card>

          <PrimaryButton
            title="Save Application"
            icon="check"
            loading={isSaving}
            size="lg"
            onPress={handleSave}
            style={styles.bottomBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: {
    marginBottom: Spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  textArea: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 160,
    lineHeight: 20,
  },
  inputGroup: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
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
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 2,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.textInverse,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
  },
  bottomBtn: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
});
