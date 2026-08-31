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
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { ResumeLibraryItem } from '@/services/latex/types';
import { formatRelativeDate } from '@/services/tracking/trackingHelpers';
import { JOB_STATUSES, JobStatus } from '@/types/job';

const FILTER_OPTIONS: Array<'All' | JobStatus> = ['All', ...JOB_STATUSES];

export default function ResumeLibraryScreen() {
  const router = useRouter();

  const [resumes, setResumes] = useState<ResumeLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | JobStatus>('All');
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadResumes() {
        try {
          const list = await resumeRepository.getAllResumeVersions();
          if (isMounted) {
            setResumes(list);
          }
        } catch (error) {
          console.error('Failed to load resume library:', error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
      loadResumes();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const filteredResumes = resumes.filter((item) => {
    if (selectedStatus !== 'All' && item.jobStatus !== selectedStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const roleMatch = (item.targetRole || '').toLowerCase().includes(q);
      const compMatch = (item.targetCompany || '').toLowerCase().includes(q);
      return roleMatch || compMatch;
    }

    return true;
  });

  const renderResumeItem = ({ item }: { item: ResumeLibraryItem }) => {
    const isSuccess = item.generationStatus === 'Generated' && item.pdfPath;
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.resumeCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/resumes/${item.id}`)}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={Typography.itemTitle} numberOfLines={1}>
              {item.targetRole || 'Software Professional'}
            </Text>
            <Text style={Typography.supporting} numberOfLines={1}>
              {item.targetCompany || 'Company not specified'}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            {item.isApproved && (
              <View style={styles.approvedPill}>
                <Feather name="check" size={10} color={Colors.successText} />
                <Text style={styles.approvedPillText}>Approved</Text>
              </View>
            )}
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{item.versionNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={Typography.caption}>
            {formattedDate} • {formatRelativeDate(item.createdAt)}
          </Text>
          <Text style={styles.templateTag}>{item.templateVersion || 'master-v1'}</Text>
        </View>

        <View style={styles.footerRow}>
          <View
            style={[
              styles.pdfStatusPill,
              isSuccess
                ? styles.pdfStatusSuccess
                : item.generationStatus === 'Failed'
                ? styles.pdfStatusFailed
                : styles.pdfStatusPending,
            ]}>
            <Feather
              name={isSuccess ? 'check' : item.generationStatus === 'Failed' ? 'x-circle' : 'clock'}
              size={11}
              color={
                isSuccess
                  ? Colors.successText
                  : item.generationStatus === 'Failed'
                  ? Colors.errorText
                  : Colors.warningText
              }
            />
            <Text
              style={[
                styles.pdfStatusText,
                isSuccess
                  ? styles.pdfStatusTextSuccess
                  : item.generationStatus === 'Failed'
                  ? styles.pdfStatusTextFailed
                  : styles.pdfStatusTextPending,
              ]}>
              {isSuccess ? 'PDF Ready' : item.generationStatus === 'Failed' ? 'Failed' : 'Pending'}
            </Text>
          </View>

          {item.jobStatus && (
            <View style={styles.jobStatusArea}>
              <StatusBadge status={item.jobStatus} size="sm" />
            </View>
          )}

          <Feather name="chevron-right" size={14} color={Colors.textMuted} style={styles.arrowIcon} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Resume Library"
        subtitle={`${resumes.length} generated versions`}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={IconSizes.sm} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search role or company..."
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

      {/* Status Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map((status) => {
            const isSelected = selectedStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedStatus(status)}>
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Resumes List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={Typography.caption}>Loading resume library...</Text>
        </View>
      ) : filteredResumes.length === 0 ? (
        <EmptyState
          title={
            searchQuery.trim()
              ? 'No Resumes Match Search'
              : selectedStatus !== 'All'
              ? `No Resumes for ${selectedStatus} Applications`
              : 'No Resumes Generated Yet'
          }
          description={
            searchQuery.trim()
              ? `No resumes found for "${searchQuery}".`
              : 'Every resume generated across all your job applications will appear here.'
          }
          actionLabel={searchQuery || selectedStatus !== 'All' ? undefined : 'View Jobs'}
          onAction={
            searchQuery || selectedStatus !== 'All'
              ? undefined
              : () => router.push('/jobs')
          }
        />
      ) : (
        <FlatList
          data={filteredResumes}
          keyExtractor={(item) => item.id}
          renderItem={renderResumeItem}
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
  resumeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  approvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 3,
  },
  approvedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successText,
  },
  versionBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateTag: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 2,
  },
  pdfStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  pdfStatusSuccess: {
    backgroundColor: Colors.successBg,
  },
  pdfStatusPending: {
    backgroundColor: Colors.warningBg,
  },
  pdfStatusFailed: {
    backgroundColor: Colors.errorBg,
  },
  pdfStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pdfStatusTextSuccess: {
    color: Colors.successText,
  },
  pdfStatusTextPending: {
    color: Colors.warningText,
  },
  pdfStatusTextFailed: {
    color: Colors.errorText,
  },
  jobStatusArea: {
    marginLeft: 'auto',
  },
  arrowIcon: {
    marginLeft: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
