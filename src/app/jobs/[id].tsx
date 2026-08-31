import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { jobRepository } from '@/database/repositories/jobRepository';
import { JOB_STATUSES, Job, JobStatus } from '@/types/job';

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  Draft: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  Ready: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  Applied: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  Interview: { bg: '#EDE9FE', text: '#7C3AED', border: '#DDD6FE' },
  Offer: { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
  Rejected: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  Withdrawn: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
};

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadJob = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await jobRepository.getJob(id);
      setJob(data);
    } catch (error) {
      console.error('Failed to load job details:', error);
      Alert.alert('Error', 'Failed to load job details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const handleDelete = () => {
    if (!job) return;
    Alert.alert(
      'Delete Job Application',
      `Are you sure you want to delete this job posting for "${job.role || 'this role'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobRepository.deleteJob(job.id);
              router.replace('/jobs');
            } catch (error) {
              console.error('Failed to delete job:', error);
              Alert.alert('Error', 'Failed to delete job.');
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job || job.status === newStatus) return;
    try {
      await jobRepository.updateJob(job.id, { status: newStatus });
      setJob((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update job status.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Job Details...</Text>
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
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Job Not Found</Text>
          <Text style={styles.notFoundSubtext}>
            This job posting may have been deleted or does not exist.
          </Text>
          <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/jobs')}>
            <Text style={styles.backHomeText}>Return to Jobs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_COLORS[job.status] || STATUS_COLORS.Draft;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Jobs</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {job.role || job.company || 'Job Details'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/jobs/edit/${job.id}`)}
          style={styles.editBtn}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Main Job Header Card */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.roleTitle}>{job.role || 'Untitled Role'}</Text>
              <Text style={styles.companyName}>
                {job.company || 'Company not specified'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
              ]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {job.status}
              </Text>
            </View>
          </View>

          {/* Quick status selector */}
          <Text style={styles.statusLabel}>Update Status:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusRow}>
            {JOB_STATUSES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusChip,
                  job.status === st && styles.statusChipActive,
                ]}
                onPress={() => handleStatusChange(st)}>
                <Text
                  style={[
                    styles.statusChipText,
                    job.status === st && styles.statusChipTextActive,
                  ]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Metadata items */}
          <View style={styles.metaDivider} />

          <View style={styles.metaGrid}>
            {job.location ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>📍 Location</Text>
                <Text style={styles.metaValue}>{job.location}</Text>
              </View>
            ) : null}

            {job.salary ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>💰 Salary</Text>
                <Text style={styles.metaValue}>{job.salary}</Text>
              </View>
            ) : null}

            {job.applicationEmail ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>✉️ Application Email</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${job.applicationEmail}`)}>
                  <Text style={[styles.metaValue, styles.linkText]}>
                    {job.applicationEmail}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {job.source ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>🌐 Source</Text>
                <Text style={styles.metaValue}>{job.source}</Text>
              </View>
            ) : null}

            {job.sourceUrl ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>🔗 Link</Text>
                <TouchableOpacity onPress={() => Linking.openURL(job.sourceUrl!)}>
                  <Text style={[styles.metaValue, styles.linkText]} numberOfLines={1}>
                    {job.sourceUrl}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <Text style={styles.dateMeta}>
            Added on {new Date(job.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </Text>
        </View>

        {/* Complete Raw Job Description */}
        <View style={styles.card}>
          <View style={styles.jdHeader}>
            <Text style={styles.jdTitle}>Original Job Description</Text>
            <View style={styles.preservedBadge}>
              <Text style={styles.preservedText}>Preserved Verbatim</Text>
            </View>
          </View>
          <View style={styles.jdContentWrapper}>
            <Text style={styles.jdText}>{job.jobDescription}</Text>
          </View>
        </View>

        {/* Delete Job Action */}
        <TouchableOpacity style={styles.deleteActionBtn} onPress={handleDelete}>
          <Text style={styles.deleteActionText}>Delete Job Posting</Text>
        </TouchableOpacity>
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
    marginHorizontal: 8,
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editText: {
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  notFoundSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  backHomeBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  statusChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  metaGrid: {
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  linkText: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  dateMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 14,
  },
  jdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jdTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  preservedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  preservedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  jdContentWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  jdText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  deleteActionBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});
