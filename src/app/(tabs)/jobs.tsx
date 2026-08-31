import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JobsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* App Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Jobs</Text>
          <Text style={styles.subtitle}>Track and manage your opportunities</Text>
        </View>

        {/* Jobs Placeholder Area */}
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Jobs Pipeline</Text>
          </View>
          <Text style={styles.cardTitle}>Application Tracker</Text>
          <Text style={styles.cardDescription}>
            This section will help you manage all your job opportunities and application stages.
          </Text>

          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• List of saved and applied jobs</Text>
            <Text style={styles.featureItem}>• Detailed job descriptions & requirements</Text>
            <Text style={styles.featureItem}>• Status tracking (Saved, Applied, Interviewing, Offer, Rejected)</Text>
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>HireLog Jobs Module</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginVertical: 'auto',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  featureItem: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
