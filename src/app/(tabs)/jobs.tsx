import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { jobRepository } from '@/database/repositories/jobRepository';
import { Job, JobStatus } from '@/types/job';

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  Draft: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  Ready: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  Applied: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  Interview: { bg: '#EDE9FE', text: '#7C3AED', border: '#DDD6FE' },
  Offer: { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
  Rejected: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  Withdrawn: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
};

export default function JobsScreen() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
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

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.role.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.status.toLowerCase().includes(query)
    );
  });

  const renderJobItem = ({ item }: { item: Job }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.Draft;
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

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
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          {item.location ? (
            <Text style={styles.metaText} numberOfLines={1}>
              📍 {item.location}
            </Text>
          ) : null}
          {item.salary ? (
            <Text style={styles.metaText} numberOfLines={1}>
              💰 {item.salary}
            </Text>
          ) : null}
          <Text style={styles.dateText}>Added {formattedDate}</Text>
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
          <Text style={styles.title}>Jobs & Applications</Text>
          <Text style={styles.subtitle}>
            {jobs.length} {jobs.length === 1 ? 'posting' : 'postings'} tracked
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/jobs/new')}>
          <Text style={styles.addBtnText}>+ New Job</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {jobs.length > 0 ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by role, company, location, or status..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Jobs...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>💼</Text>
          </View>
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptySubtext}>
            Paste Job Descriptions from LinkedIn, Indeed, or company sites. HireLog will preserve
            the JD to tailor resumes in upcoming modules.
          </Text>
          <TouchableOpacity
            style={styles.createFirstBtn}
            onPress={() => router.push('/jobs/new')}>
            <Text style={styles.createFirstText}>+ Add Your First Job</Text>
          </TouchableOpacity>
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
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
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
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
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
