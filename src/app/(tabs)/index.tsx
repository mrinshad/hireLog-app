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
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FadeInView } from '@/components/common/FadeInView';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PrimaryButton } from '@/components/common/Buttons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { jobRepository } from '@/database/repositories/jobRepository';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
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
      <AppHeader
        title="HireLog"
        showLogo={true}
        rightAction={
          <PrimaryButton
            title="New Job"
            icon="plus"
            size="sm"
            onPress={() => router.push('/jobs/new')}
          />
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Metrics Grid */}
        <FadeInView delay={50}>
          <View style={styles.metricsGrid}>
            <TouchableOpacity
              style={[styles.metricCard, styles.metricCardPrimary]}
              activeOpacity={0.7}
              onPress={() => router.push('/jobs')}>
              <Text style={[styles.metricNumber, { color: Colors.primary }]}>{metrics.total}</Text>
              <Text style={styles.metricLabel}>Total</Text>
            </TouchableOpacity>

            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: Colors.infoText }]}>{metrics.applied}</Text>
              <Text style={styles.metricLabel}>Applied</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: '#7C3AED' }]}>{metrics.interview}</Text>
              <Text style={styles.metricLabel}>Interview</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: Colors.successText }]}>{metrics.offer}</Text>
              <Text style={styles.metricLabel}>Offer</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: Colors.errorText }]}>{metrics.rejected}</Text>
              <Text style={styles.metricLabel}>Rejected</Text>
            </View>
          </View>
        </FadeInView>

        {/* Recent Activity */}
        <View style={styles.sectionHeaderRow}>
          <Text style={Typography.sectionTitle}>Recent Activity</Text>
          {recentJobs.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/jobs')}>
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {recentJobs.length === 0 ? (
          <EmptyState
            icon="briefcase"
            title="No applications yet"
            actionLabel="Add Job"
            actionIcon="plus"
            onAction={() => router.push('/jobs/new')}
          />
        ) : (
          recentJobs.map((job, index) => {
            const dateLabel =
              job.status === 'Applied' && job.appliedAt
                ? `Applied ${formatRelativeDate(job.appliedAt)}`
                : formatRelativeDate(job.updatedAt);

            return (
              <FadeInView key={job.id} delay={100 + index * 60}>
                <TouchableOpacity
                  style={styles.jobCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/jobs/${job.id}`)}>
                  <View style={styles.jobInfo}>
                    <Text style={Typography.itemTitle} numberOfLines={1}>
                      {job.role || 'Untitled Role'}
                    </Text>
                    <Text style={Typography.supporting} numberOfLines={1}>
                      {job.company || 'Company not specified'}
                      {job.location ? ` • ${job.location}` : ''}
                    </Text>
                  </View>

                  <View style={styles.jobEndCol}>
                    <StatusBadge status={job.status} size="sm" />
                    <Text style={Typography.caption}>{dateLabel}</Text>
                  </View>
                </TouchableOpacity>
              </FadeInView>
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
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  metricCardPrimary: {
    backgroundColor: Colors.primaryLight,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  jobEndCol: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
});
