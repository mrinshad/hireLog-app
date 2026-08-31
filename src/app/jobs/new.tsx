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
      newErrors.sourceUrl = 'Please enter a valid URL (starting with http:// or https://).';
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Application</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}>
            <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Focal Input: Job Description */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Job Description <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.charCount}>{jobDescription.length} chars</Text>
            </View>
            <Text style={styles.fieldHint}>
              Paste the complete, raw Job Description. HireLog preserves it verbatim for JD matching.
            </Text>
            <TextInput
              style={[
                styles.textArea,
                errors.jobDescription ? styles.inputError : null,
              ]}
              placeholder="Paste full Job Description here..."
              placeholderTextColor="#94A3B8"
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
          </View>

          {/* Job Status Selector */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Application Status</Text>
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
          </View>

          {/* Optional Details Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Role & Company Details (Optional)</Text>
            <Text style={styles.fieldHint}>
              You can specify these now or edit them anytime later.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Title / Role</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Senior Frontend Engineer"
                placeholderTextColor="#94A3B8"
                value={role}
                onChangeText={setRole}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Stripe, Google, Acme Corp"
                placeholderTextColor="#94A3B8"
                value={company}
                onChangeText={setCompany}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location / Work Mode</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Remote, San Francisco, CA"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Application Email</Text>
              <TextInput
                style={[styles.input, errors.applicationEmail && styles.inputError]}
                placeholder="e.g. jobs@company.com"
                placeholderTextColor="#94A3B8"
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
              <Text style={styles.label}>Salary / Compensation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. $140,000 - $170,000"
                placeholderTextColor="#94A3B8"
                value={salary}
                onChangeText={setSalary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.label}>Source</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. LinkedIn, Indeed"
                  placeholderTextColor="#94A3B8"
                  value={source}
                  onChangeText={setSource}
                />
              </View>

              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.label}>Source URL</Text>
                <TextInput
                  style={[styles.input, errors.sourceUrl && styles.inputError]}
                  placeholder="e.g. https://..."
                  placeholderTextColor="#94A3B8"
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
          </View>

          {/* Bottom Save Action */}
          <TouchableOpacity
            style={[styles.bottomSaveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}>
            <Text style={styles.bottomSaveText}>{isSaving ? 'Saving Job...' : 'Save Application'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  fieldHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 180,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  bottomSaveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  bottomSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
