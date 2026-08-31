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
import { Job, JOB_STATUSES, JobStatus } from '@/types/job';

const FILTER_OPTIONS: Array<'All' | JobStatus> = ['All', ...JOB_STATUSES];

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
          {item.analysis ? (
            <View style={styles.analyzedBadge}>
              <Feather name="check" size={10} color={Colors.primary} />
              <Text style={styles.analyzedBadgeText}>JD Analyzed</Text>
            </View>
          ) : null}
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
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={IconSizes.sm} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}>
          {FILTER_OPTIONS.map((status) => {
            const isSelected = selectedStatus === status;
            const count =
              status === 'All' ? jobs.length : statusCounts[status] || 0;

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedStatus(status)}>
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}>
                  {status} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading applications...</Text>
        </View>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={searchQuery || selectedStatus !== 'All' ? 'search' : 'briefcase'}
          title={searchQuery || selectedStatus !== 'All' ? 'No matching jobs' : 'No applications yet'}
          description={
            searchQuery || selectedStatus !== 'All'
              ? 'Try adjusting your search or status filter.'
              : 'Add your first job to start tailoring resumes.'
          }
          actionLabel={searchQuery || selectedStatus !== 'All' ? 'Clear Filters' : 'Add Job'}
          actionIcon={searchQuery || selectedStatus !== 'All' ? 'x-circle' : 'plus'}
          onAction={
            searchQuery || selectedStatus !== 'All'
              ? () => {
                  setSearchQuery('');
                  setSelectedStatus('All');
                }
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  filterChipsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.sm,
  },
  filterChipsRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  filterChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextSelected: {
    color: Colors.textInverse,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
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
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  analyzedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  analyzedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
});
