import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PrimaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { jobRepository } from '@/database/repositories/jobRepository';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
import { Job, JOB_STATUSES, JobStatus, WorkflowState } from '@/types/job';

const FILTER_OPTIONS: Array<'All' | JobStatus> = ['All', ...JOB_STATUSES];

function getWorkflowLabel(state?: WorkflowState): string {
  switch (state) {
    case 'ANALYZING_JD':
      return 'Analyzing JD';
    case 'MATCHING_PROFILE':
      return 'Matching Profile';
    case 'GENERATING_RESUME':
      return 'Generating Resume';
    case 'RESUME_REVIEW':
      return 'Resume Review';
    case 'GENERATING_EMAIL':
      return 'Drafting Email';
    case 'EMAIL_REVIEW':
      return 'Email Review';
    case 'EMAIL_OPENED':
      return 'Email Opened';
    case 'APPLIED':
      return 'Applied';
    case 'FAILED':
      return 'Needs Attention';
    default:
      return 'Draft';
  }
}

export default function JobsScreen() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'All' | JobStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadJobs() {
        try {
          const list = await jobRepository.getJobs();
          if (isMounted) {
            setJobs(list);
          }
        } catch (error) {
          console.error('Failed to load jobs:', error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
      loadJobs();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const statusCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  const filteredJobs = jobs.filter((job) => {
    if (selectedStatus !== 'All' && job.status !== selectedStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const roleMatch = (job.role || '').toLowerCase().includes(q);
      const compMatch = (job.company || '').toLowerCase().includes(q);
      const locMatch = (job.location || '').toLowerCase().includes(q);
      return roleMatch || compMatch || locMatch;
    }

    return true;
  });

  const renderJobItem = ({ item }: { item: Job }) => {
    const dateLabel =
      item.status === 'Applied' && item.appliedAt
        ? `Applied ${formatRelativeDate(item.appliedAt)}`
        : formatRelativeDate(item.updatedAt);

    const stageLabel = getWorkflowLabel(item.workflowState);

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/jobs/${item.id}`)}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={Typography.itemTitle} numberOfLines={1}>
              {item.role || 'Untitled Role'}
            </Text>
            <Text style={Typography.supporting} numberOfLines={1}>
              {item.company || 'Company not specified'}
              {item.location ? ` • ${item.location}` : ''}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        <View style={styles.cardMetaRow}>
          <Text style={Typography.caption}>{dateLabel}</Text>

          <View style={styles.stagePill}>
            <Text style={styles.stagePillText}>{stageLabel}</Text>
          </View>

          <Feather name="chevron-right" size={14} color={Colors.textMuted} style={styles.arrowIcon} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Jobs"
        subtitle={`${jobs.length} applications`}
        rightAction={
          <PrimaryButton
            title="New Job"
            icon="plus"
            size="sm"
            onPress={() => router.push('/jobs/new')}
          />
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={IconSizes.sm} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search role, company, or location..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={IconSizes.sm} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map((status) => {
            const isSelected = selectedStatus === status;
            const count = status === 'All' ? jobs.length : statusCounts[status] || 0;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedStatus(status)}>
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {status} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Job Cards List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading applications...</Text>
        </View>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title={
            searchQuery.trim()
              ? 'No Matching Jobs'
              : selectedStatus !== 'All'
              ? `No ${selectedStatus} Applications`
              : 'No Applications Yet'
          }
          description={
            searchQuery.trim()
              ? `No jobs match "${searchQuery}". Try different keywords.`
              : selectedStatus !== 'All'
              ? `No jobs currently in ${selectedStatus} status.`
              : 'Paste a job description to start an automated application pipeline.'
          }
          actionLabel={searchQuery || selectedStatus !== 'All' ? undefined : 'Start Application'}
          onAction={
            searchQuery || selectedStatus !== 'All'
              ? undefined
              : () => router.push('/jobs/new')
          }
        />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  titleArea: {
    flex: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  stagePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
