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
import { formatRelativeDate, STATUS_CONFIG } from '@/services/tracking/trackingHelpers';
import { DashboardMetrics, Job } from '@/types/job';

export default function HomeScreen() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total: 0,
    draft: 0,
    ready: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadDashboard() {
        try {
          const [m, recents] = await Promise.all([
            jobRepository.getDashboardMetrics(),
            jobRepository.getRecentJobs(5),
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
          <Text style={styles.subtitle}>Applications & Career Hub</Text>
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
        {/* Quick Action Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Text style={styles.heroIcon}>⚡</Text>
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Track a New Job Application</Text>
            <Text style={styles.heroSubtext}>
              Paste a job description to capture details, customize your resume, and track your progress.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.heroActionBtn}
            onPress={() => router.push('/jobs/new')}>
            <Text style={styles.heroActionText}>+ Create Application</Text>
          </TouchableOpacity>
        </View>

        {/* Application Metrics */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Applications Overview</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricCardTotal]}>
            <Text style={[styles.metricNumber, { color: '#2563EB' }]}>{metrics.total}</Text>
            <Text style={styles.metricLabel}>Total Jobs</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#0284C7' }]}>{metrics.applied}</Text>
            <Text style={styles.metricLabel}>Applied</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#7C3AED' }]}>{metrics.interview}</Text>
            <Text style={styles.metricLabel}>Interviews</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#059669' }]}>{metrics.offer}</Text>
            <Text style={styles.metricLabel}>Offers</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#E11D48' }]}>{metrics.rejected}</Text>
            <Text style={styles.metricLabel}>Rejected</Text>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentJobs.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/jobs')}>
              <Text style={styles.viewAllText}>View All ({metrics.total}) →</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No job applications yet</Text>
            <Text style={styles.emptyText}>
              Start by tapping &quot;+ New Application&quot; to paste a job posting and track your progress.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/jobs/new')}>
              <Text style={styles.emptyActionText}>Add Your First Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentJobs.map((job) => {
            const statusStyle = STATUS_CONFIG[job.status] || STATUS_CONFIG.Draft;
            const relevantDate =
              job.status === 'Applied' && job.appliedAt
                ? `Applied · ${formatRelativeDate(job.appliedAt)}`
                : `${statusStyle.label} · ${formatRelativeDate(job.updatedAt)}`;

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
                    {job.location ? ` • ${job.location}` : ''}
                  </Text>
                </View>
                <View style={styles.jobEndCol}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: statusStyle.bg,
                        borderColor: statusStyle.border,
                      },
                    ]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                      {statusStyle.icon} {statusStyle.label}
                    </Text>
                  </View>
                  <Text style={styles.jobDateText}>{relevantDate}</Text>
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricCardTotal: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '700',
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
    padding: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  jobEndCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  jobDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
