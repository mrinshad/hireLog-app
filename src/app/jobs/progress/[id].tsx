import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { jobRepository } from '@/database/repositories/jobRepository';
import { WorkflowProgress } from '@/services/workflow/types';
import { workflowOrchestrator } from '@/services/workflow/workflowOrchestrator';
import { Job } from '@/types/job';

interface StepItem {
  id: string;
  title: string;
}

const PIPELINE_STEPS: StepItem[] = [
  { id: 'ANALYZING_JD', title: 'Analyzing job description' },
  { id: 'MATCHING_PROFILE', title: 'Matching with your profile' },
  { id: 'GENERATING_RESUME', title: 'Preparing your tailored resume' },
  { id: 'PDF_COMPILATION', title: 'Generating PDF document' },
];

export default function ApplicationProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runPipeline = async () => {
    if (!id) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const jobData = await jobRepository.getJob(id);
      setJob(jobData);

      const initialCompleted: any[] = [];
      if (jobData?.analysis && jobData.analysisStatus === 'Analyzed') {
        initialCompleted.push('ANALYZING_JD');
      }
      if (jobData?.matchResult) {
        initialCompleted.push('MATCHING_PROFILE');
      }

      setProgress({
        jobId: id,
        currentStep: initialCompleted.includes('MATCHING_PROFILE')
          ? 'GENERATING_RESUME'
          : initialCompleted.includes('ANALYZING_JD')
          ? 'MATCHING_PROFILE'
          : 'ANALYZING_JD',
        stepTitle: 'Preparing application...',
        stepIndex: initialCompleted.length + 1,
        totalSteps: 4,
        completedSteps: initialCompleted,
        isError: false,
      });

      const result = await workflowOrchestrator.startWorkflow(id, (p) => {
        setProgress(p);
      });

      if (result.success && result.nextRoute) {
        // Small delay for smooth visual transition
        setTimeout(() => {
          router.replace(result.nextRoute as any);
        }, 600);
      } else if (!result.success) {
        setErrorMessage(result.error || 'Failed to complete workflow.');
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Pipeline error:', error);
      setErrorMessage(error.message || 'Unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    runPipeline();
  }, [id]);

  const handleRetry = async () => {
    if (!id) return;
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const result = await workflowOrchestrator.retryWorkflow(id, (p) => {
        setProgress(p);
      });

      if (result.success && result.nextRoute) {
        router.replace(result.nextRoute as any);
      } else {
        setErrorMessage(result.error || 'Failed on retry.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Retry failed.');
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Preparing Application"
        subtitle={job?.company || 'Automated Pipeline'}
        showBack
      />

      <View style={styles.container}>
        <Card style={styles.progressCard}>
          <View style={styles.headerRow}>
            <View style={styles.heroTitleArea}>
              <Text style={Typography.screenTitle} numberOfLines={1}>
                {job?.role || 'Job Application'}
              </Text>
              <Text style={[Typography.itemTitle, { color: Colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {job?.company || 'Company'}
              </Text>
            </View>
            {isProcessing && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          <View style={styles.divider} />

          <View style={styles.stepsList}>
            {PIPELINE_STEPS.map((step, idx) => {
              const isCompleted =
                (progress?.completedSteps || []).includes(step.id as any) ||
                (step.id === 'PDF_COMPILATION' &&
                  (progress?.completedSteps || []).includes('GENERATING_RESUME'));

              const isCurrent =
                isProcessing &&
                !isCompleted &&
                (progress?.currentStep === step.id ||
                  (step.id === 'PDF_COMPILATION' && progress?.currentStep === 'GENERATING_RESUME'));

              return (
                <View key={step.id} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      isCompleted && styles.stepIconCompleted,
                      isCurrent && styles.stepIconCurrent,
                    ]}>
                    {isCompleted ? (
                      <Feather name="check" size={14} color={Colors.textInverse} />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    )}
                  </View>

                  <View style={styles.stepTextArea}>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        isCompleted && styles.stepTextCompleted,
                        isCurrent && styles.stepTextCurrent,
                      ]}>
                      {step.title}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={IconSizes.sm} color={Colors.errorText} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Issue Encountered</Text>
                <Text style={styles.errorDescription}>{errorMessage}</Text>
              </View>
            </View>
          )}

          {errorMessage && (
            <View style={styles.actionRow}>
              <PrimaryButton
                title="Retry Step"
                icon="refresh-cw"
                onPress={handleRetry}
                style={{ flex: 1 }}
              />
              <SecondaryButton
                title="View Job"
                icon="arrow-left"
                onPress={() => router.replace(`/jobs/${id}`)}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </Card>
      </View>
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
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  progressCard: {
    padding: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitleArea: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.lg,
  },
  stepsList: {
    gap: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stepIconCurrent: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  stepTextArea: {
    flex: 1,
  },
  stepTextCompleted: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  stepTextCurrent: {
    color: Colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.errorBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.errorText,
    marginBottom: 2,
  },
  errorDescription: {
    fontSize: 12,
    color: Colors.errorText,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
