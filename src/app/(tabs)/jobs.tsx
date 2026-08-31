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

import { jobRepository } from '@/database/repositories/jobRepository';
import { formatRelativeDate, STATUS_CONFIG } from '@/services/tracking/trackingHelpers';
import { Job, JOB_STATUSES, JobStatus } from '@/types/job';

const FILTER_OPTIONS: Array<'All' | JobStatus> = ['All', ...JOB_STATUSES];

export default function JobsScreen() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'All' | JobStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Refresh job list whenever screen is focused
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

  // Calculate status counts
  const statusCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  // Local filtering & searching (zero AI, 100% deterministic)
  const filteredJobs = jobs.filter((job) => {
    // 1. Status Filter
    if (selectedStatus !== 'All' && job.status !== selectedStatus) {
      return false;
    }

    // 2. Search Query (Role, Company, Location)
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
    const statusStyle = STATUS_CONFIG[item.status] || STATUS_CONFIG.Draft;
    const dateLabel =
      item.status === 'Applied' && item.appliedAt
        ? `Applied on ${formatRelativeDate(item.appliedAt)}`
        : `Updated ${formatRelativeDate(item.updatedAt)}`;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/jobs/${item.id}`)}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={styles.roleTitle} numberOfLines={1}>
              {item.role || 'Untitled Role'}
            </Text>
            <Text style={styles.companyTitle} numberOfLines={1}>
              {item.company || 'Company not specified'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
            ]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.icon} {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          {item.location ? (
            <Text style={styles.metaText} numberOfLines={1}>
              📍 {item.location}
            </Text>
          ) : null}
          {item.analysis ? (
            <View style={styles.analyzedBadge}>
              <Text style={styles.analyzedBadgeText}>✓ Analyzed</Text>
            </View>
          ) : null}
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>

        {/* JD snippet */}
        <Text style={styles.jdSnippet} numberOfLines={2}>
          {item.jobDescription}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Job Applications</Text>
          <Text style={styles.subtitle}>
            {filteredJobs.length} {filteredJobs.length === 1 ? 'application' : 'applications'}
            {selectedStatus !== 'All' ? ` in ${selectedStatus}` : ' total'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/jobs/new')}>
          <Text style={styles.addBtnText}>+ New Job</Text>
        </TouchableOpacity>
      </View>

      {/* Local Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by role, company, or location..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Status Filter Chips */}
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
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Applications...</Text>
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No matching applications</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery.trim()
              ? `No jobs matched "${searchQuery}" in ${selectedStatus}.`
              : `No applications found with status "${selectedStatus}".`}
          </Text>
          {searchQuery.trim() || selectedStatus !== 'All' ? (
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedStatus('All');
              }}>
              <Text style={styles.resetFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={() => router.push('/jobs/new')}>
              <Text style={styles.createFirstText}>+ Add Your First Job</Text>
            </TouchableOpacity>
          )}
        </View>
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
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    paddingRight: 36,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 26,
    top: 20,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  filterChipsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
  },
  filterChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
    marginRight: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  companyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  analyzedBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  analyzedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 'auto',
  },
  jdSnippet: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 300,
  },
  resetFilterBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  createFirstBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createFirstText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
