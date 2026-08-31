import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { jobRepository } from '@/database/repositories/jobRepository';
import { Job, JobStatus } from '@/types/job';

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string }> = {
  Draft: { bg: '#F1F5F9', text: '#475569' },
  Ready: { bg: '#EFF6FF', text: '#2563EB' },
  Applied: { bg: '#FEF3C7', text: '#D97706' },
  Interview: { bg: '#EDE9FE', text: '#7C3AED' },
  Offer: { bg: '#DCFCE7', text: '#16A34A' },
  Rejected: { bg: '#FEE2E2', text: '#DC2626' },
  Withdrawn: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function HomeScreen() {
  const router = useRouter();

  const [metrics, setMetrics] = useState({ total: 0, draft: 0, applied: 0, interview: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadDashboard() {
        try {
          const [m, recents] = await Promise.all([
            jobRepository.getMetrics(),
            jobRepository.getRecentJobs(3),
          ]);
          if (isMounted) {
            setMetrics(m);
            setRecentJobs(recents);
          }
        } catch (error) {
          console.error('Failed to load dashboard:', error);
        }
      }
      loadDashboard();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>HireLog</Text>
          <Text style={styles.subtitle}>Job application & resume manager</Text>
        </View>
        <TouchableOpacity
          style={styles.newAppBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/jobs/new')}>
          <Text style={styles.newAppText}>+ New Application</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Quick Action Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Text style={styles.heroIcon}>⚡</Text>
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Start a New Application</Text>
            <Text style={styles.heroSubtext}>
              Paste a job description to capture details and track your application pipeline.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.heroActionBtn}
            onPress={() => router.push('/jobs/new')}>
            <Text style={styles.heroActionText}>Paste JD & Start</Text>
          </TouchableOpacity>
        </View>

        {/* Application Metrics Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Application Pipeline</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{metrics.total}</Text>
            <Text style={styles.metricLabel}>Total Jobs</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#475569' }]}>{metrics.draft}</Text>
            <Text style={styles.metricLabel}>Drafts</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#D97706' }]}>{metrics.applied}</Text>
            <Text style={styles.metricLabel}>Applied</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#7C3AED' }]}>{metrics.interview}</Text>
            <Text style={styles.metricLabel}>Interview</Text>
          </View>
        </View>

        {/* Recent Applications Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          {recentJobs.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/jobs')}>
              <Text style={styles.viewAllText}>View All ({metrics.total})</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>
              Create your first application by tapping the &quot;+ New Application&quot; button above.
            </Text>
          </View>
        ) : (
          recentJobs.map((job) => {
            const statusColor = STATUS_COLORS[job.status] || STATUS_COLORS.Draft;
            return (
              <TouchableOpacity
                key={job.id}
                style={styles.recentJobCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/jobs/${job.id}`)}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobRole} numberOfLines={1}>
                    {job.role || 'Untitled Role'}
                  </Text>
                  <Text style={styles.jobCompany} numberOfLines={1}>
                    {job.company || 'Company not specified'}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusColor.text }]}>
                    {job.status}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  newAppBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newAppText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroIcon: {
    fontSize: 22,
  },
  heroTextContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 13,
    color: '#3B82F6',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  heroActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  heroActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  recentJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobInfo: {
    flex: 1,
    marginRight: 10,
  },
  jobRole: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  jobCompany: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
