import { WorkflowState } from '@/types/job';

export type WorkflowStepId =
  | 'ANALYZING_JD'
  | 'MATCHING_PROFILE'
  | 'GENERATING_RESUME'
  | 'RESUME_REVIEW'
  | 'GENERATING_EMAIL'
  | 'EMAIL_REVIEW'
  | 'EMAIL_OPENED'
  | 'APPLIED';

export interface WorkflowProgress {
  jobId: string;
  currentStep: WorkflowStepId;
  stepTitle: string;
  stepIndex: number;
  totalSteps: number;
  completedSteps: WorkflowStepId[];
  isError: boolean;
  errorMessage?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  jobId: string;
  workflowState: WorkflowState;
  nextRoute?: string;
  error?: string;
  failedStep?: string;
}
