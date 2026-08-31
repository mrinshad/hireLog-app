import { emailRepository } from '@/database/repositories/emailRepository';
import { jobRepository } from '@/database/repositories/jobRepository';
import { profileRepository } from '@/database/repositories/profileRepository';
import { resumeRepository } from '@/database/repositories/resumeRepository';
import { emailComposerService } from '@/services/email/emailComposerService';
import { emailGenerator } from '@/services/gemini/emailGenerator';
import { jdAnalyzer } from '@/services/gemini/jdAnalyzer';
import { CompilerError, latexCompiler } from '@/services/latex/compiler';
import { latexRenderer } from '@/services/latex/latexRenderer';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { resumeCustomizer } from '@/services/resume/resumeCustomizer';
import { resumeValidator } from '@/services/resume/resumeValidator';
import { JobAnalysis } from '@/types/job';
import { MatchResult } from '@/types/matching';
import { WorkflowExecutionResult, WorkflowProgress, WorkflowStepId } from './types';

export const workflowOrchestrator = {
  /**
   * Automatically executes the application workflow from JD submission to Resume Review Gate.
   * Resumes seamlessly from the last completed stage without re-running finished steps or re-spending Gemini tokens.
   */
  async startWorkflow(
    jobId: string,
    onProgress?: (progress: WorkflowProgress) => void
  ): Promise<WorkflowExecutionResult> {
    const job = await jobRepository.getJob(jobId);
    if (!job) {
      return {
        success: false,
        jobId,
        workflowState: 'FAILED',
        error: `Job ${jobId} not found in database.`,
        failedStep: 'FETCH_JOB',
      };
    }

    // If already at or past Resume Review, return current state without rerunning
    if (
      job.workflowState === 'RESUME_REVIEW' ||
      job.workflowState === 'GENERATING_EMAIL' ||
      job.workflowState === 'EMAIL_REVIEW' ||
      job.workflowState === 'EMAIL_OPENED' ||
      job.workflowState === 'APPLIED'
    ) {
      return {
        success: true,
        jobId,
        workflowState: job.workflowState,
        nextRoute:
          job.workflowState === 'RESUME_REVIEW'
            ? `/jobs/resume/${jobId}`
            : `/jobs/email/${jobId}`,
      };
    }

    const completedSteps: WorkflowStepId[] = [];

    // Pre-populate already completed steps to preserve progress and zero duplicate tokens
    const hasAnalysis = Boolean(job.analysis || job.analysisStatus === 'Analyzed' || job.matchResult);
    if (hasAnalysis) {
      completedSteps.push('ANALYZING_JD');
    }
    if (job.matchResult) {
      completedSteps.push('MATCHING_PROFILE');
    }

    const notify = (step: WorkflowStepId, title: string, index: number) => {
      onProgress?.({
        jobId,
        currentStep: step,
        stepTitle: title,
        stepIndex: index,
        totalSteps: 4,
        completedSteps: [...completedSteps],
        isError: false,
      });
    };

    // Emit initial progress with already completed steps
    if (completedSteps.length > 0) {
      const initialStep: WorkflowStepId = completedSteps.includes('MATCHING_PROFILE')
        ? 'GENERATING_RESUME'
        : 'MATCHING_PROFILE';
      notify(initialStep, 'Resuming application pipeline...', completedSteps.length + 1);
    }

    try {
      // =========================================================================
      // Stage 1: JD Analysis & Metadata Extraction (Zero Tokens If Already Done)
      // =========================================================================
      let analysis: JobAnalysis;

      if (job.analysis) {
        analysis = job.analysis;
        if (!completedSteps.includes('ANALYZING_JD')) {
          completedSteps.push('ANALYZING_JD');
        }
      } else {
        notify('ANALYZING_JD', 'Analyzing job description...', 1);
        await jobRepository.updateWorkflowState(jobId, 'ANALYZING_JD');

        analysis = await jdAnalyzer.analyze(job.jobDescription);

        const updates: any = {
          analysisStatus: 'Analyzed',
          analysis,
        };

        if ((!job.company || job.company === 'Company not specified') && analysis.company) {
          updates.company = analysis.company;
        }
        if ((!job.role || job.role === 'Untitled Role') && analysis.role) {
          updates.role = analysis.role;
        }
        if (!job.location && analysis.location) {
          updates.location = analysis.location;
        }
        if (!job.salary && analysis.salary) {
          updates.salary = analysis.salary;
        }
        if (!job.applicationEmail && analysis.applicationEmail) {
          updates.applicationEmail = analysis.applicationEmail;
        }
        if (!job.sourceUrl && analysis.applicationUrl) {
          updates.sourceUrl = analysis.applicationUrl;
        }

        await jobRepository.updateJob(jobId, updates);
        if (!completedSteps.includes('ANALYZING_JD')) {
          completedSteps.push('ANALYZING_JD');
        }
      }

      // =========================================================================
      // Stage 2: Deterministic Profile Matching
      // =========================================================================
      let matchResult: MatchResult;

      if (job.matchResult) {
        matchResult = job.matchResult;
        if (!completedSteps.includes('MATCHING_PROFILE')) {
          completedSteps.push('MATCHING_PROFILE');
        }
      } else {
        notify('MATCHING_PROFILE', 'Matching with your profile...', 2);
        await jobRepository.updateWorkflowState(jobId, 'MATCHING_PROFILE');

        const profile = await profileRepository.getProfile();
        matchResult = matchingEngine.match(profile, analysis);

        await jobRepository.updateJobMatch(jobId, matchResult);
        if (!completedSteps.includes('MATCHING_PROFILE')) {
          completedSteps.push('MATCHING_PROFILE');
        }
      }

      // =========================================================================
      // Stage 3: Resume Customization, LaTeX Rendering & PDF Compilation
      // =========================================================================
      const latestResume = await resumeRepository.getLatestResumeVersion(jobId);

      if (latestResume && latestResume.generationStatus === 'Generated') {
        if (!completedSteps.includes('GENERATING_RESUME')) {
          completedSteps.push('GENERATING_RESUME');
        }
      } else {
        notify('GENERATING_RESUME', 'Preparing your tailored resume...', 3);
        await jobRepository.updateWorkflowState(jobId, 'GENERATING_RESUME');

        const profile = await profileRepository.getProfile();
        const customizedResume = resumeCustomizer.customize(
          profile,
          analysis,
          matchResult,
          jobId
        );

        // Enforce 100% ID and factual traceability against profile
        resumeValidator.validate(profile, customizedResume);

        // Render LaTeX source code using Master template
        const latexSource = latexRenderer.render(customizedResume);

        // Save resume record in SQLite
        const newVersion = await resumeRepository.saveResumeVersion(
          jobId,
          customizedResume,
          latexSource,
          null,
          'Generated',
          null,
          'master-v1'
        );

        // Attempt remote PDF compilation gracefully
        notify('GENERATING_RESUME', 'Generating PDF document...', 4);
        try {
          const { pdfPath } = await latexCompiler.compileToPdf(
            latexSource,
            jobId,
            newVersion.id
          );

          await resumeRepository.updateResumePdf(
            newVersion.id,
            pdfPath,
            'Generated',
            null
          );
        } catch (compileErr: any) {
          console.warn('PDF remote compilation skipped (fallback to in-app document view):', compileErr.message || compileErr);
          await resumeRepository.updateResumePdf(
            newVersion.id,
            null,
            'Generated',
            compileErr.message || 'Compiled for in-app viewing'
          );
        }

        if (!completedSteps.includes('GENERATING_RESUME')) {
          completedSteps.push('GENERATING_RESUME');
        }
      }

      // =========================================================================
      // Stage 4: Halt at Gate 1 (Resume Approval Gate)
      // =========================================================================
      await jobRepository.updateWorkflowState(jobId, 'RESUME_REVIEW');

      // Update Application Status to Ready if currently Draft
      if (job.status === 'Draft') {
        await jobRepository.updateJob(jobId, { status: 'Ready' });
      }

      return {
        success: true,
        jobId,
        workflowState: 'RESUME_REVIEW',
        nextRoute: `/jobs/resume/${jobId}`,
      };
    } catch (err: any) {
      console.error(`Workflow failed for job ${jobId}:`, err);
      const failedStep = completedSteps.includes('MATCHING_PROFILE')
        ? 'GENERATING_RESUME'
        : completedSteps.includes('ANALYZING_JD')
        ? 'MATCHING_PROFILE'
        : 'ANALYZING_JD';

      const errorMessage = err.message || 'Workflow execution encountered an error.';

      await jobRepository.updateWorkflowState(jobId, 'FAILED', failedStep, errorMessage);

      onProgress?.({
        jobId,
        currentStep: failedStep,
        stepTitle: 'Workflow encountered an issue',
        stepIndex: completedSteps.length + 1,
        totalSteps: 4,
        completedSteps,
        isError: true,
        errorMessage,
      });

      return {
        success: false,
        jobId,
        workflowState: 'FAILED',
        error: errorMessage,
        failedStep,
      };
    }
  },

  /**
   * Retries a failed workflow stage without repeating previous successful steps or re-spending tokens.
   */
  async retryWorkflow(
    jobId: string,
    onProgress?: (progress: WorkflowProgress) => void
  ): Promise<WorkflowExecutionResult> {
    const job = await jobRepository.getJob(jobId);
    // Determine resume state based on what's already saved
    const resumeState = job?.matchResult
      ? 'GENERATING_RESUME'
      : job?.analysis || job?.analysisStatus === 'Analyzed'
      ? 'MATCHING_PROFILE'
      : 'ANALYZING_JD';

    await jobRepository.updateWorkflowState(jobId, resumeState, null, null);
    return this.startWorkflow(jobId, onProgress);
  },

  /**
   * Gate 1 Approval: User approves the generated resume.
   * Transitions workflow to GENERATING_EMAIL, drafts the email automatically, and halts at Gate 2 (EMAIL_REVIEW).
   */
  async approveResume(
    jobId: string,
    resumeVersionId: string
  ): Promise<WorkflowExecutionResult> {
    try {
      // 1. Persist resume approval on Job record
      await jobRepository.setApprovedResumeVersion(jobId, resumeVersionId);

      // 2. Check if draft already exists
      const existingDraft = await emailRepository.getDraftByJobId(jobId);

      if (!existingDraft || !existingDraft.body || !existingDraft.body.trim()) {
        const [job, profile, resumeVer] = await Promise.all([
          jobRepository.getJob(jobId),
          profileRepository.getProfile(),
          resumeRepository.getResumeLibraryDetails(resumeVersionId),
        ]);

        if (!job) throw new Error(`Job ${jobId} not found.`);

        // Resolve recipient, subject, and signature
        const { recipient } = emailComposerService.resolveRecipient(job);
        const subject = emailComposerService.formatDefaultSubject(
          job.role,
          profile.personalDetails.fullName
        );
        const signature = emailComposerService.formatSignature(profile);

        // Generate email body with Gemini
        const matchResult =
          job.matchResult || (job.analysis ? matchingEngine.match(profile, job.analysis) : null);
        const matchedSkills = matchResult?.allMatchedSkills || [];
        const topExp = profile.experience[0];
        const topProj = profile.projects[0];

        let body = '';
        try {
          body = await emailGenerator.generateEmailBody({
            role: job.role,
            company: job.company,
            matchedSkills,
            topExperienceCompany: topExp?.company,
            topExperienceRole: topExp?.jobTitle,
            topProjectName: topProj?.projectName,
            topProjectDomain: topProj?.projectTypeOrDomain,
            candidateName: profile.personalDetails.fullName,
          });
        } catch (genErr) {
          console.warn('Auto email body generation fallback:', genErr);
          body = `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${job.role || 'open'} position at ${job.company || 'your company'}.\n\nPlease find my resume attached for your review.\n\nBest regards,`;
        }

        // Save email draft
        await emailRepository.saveDraft({
          jobId,
          resumeVersionId,
          recipient,
          subject,
          body,
          signature,
          resumeFilePath: resumeVer?.pdfPath || null,
        });
      }

      // 3. Transition to Gate 2 (EMAIL_REVIEW)
      await jobRepository.updateWorkflowState(jobId, 'EMAIL_REVIEW');

      return {
        success: true,
        jobId,
        workflowState: 'EMAIL_REVIEW',
        nextRoute: `/jobs/email/${jobId}`,
      };
    } catch (error: any) {
      console.error(`Approve resume failed for job ${jobId}:`, error);
      await jobRepository.updateWorkflowState(
        jobId,
        'FAILED',
        'GENERATING_EMAIL',
        error.message || 'Failed to prepare application email.'
      );

      return {
        success: false,
        jobId,
        workflowState: 'FAILED',
        error: error.message || 'Failed to prepare application email.',
        failedStep: 'GENERATING_EMAIL',
      };
    }
  },

  /**
   * Gate 2 Handoff: Launches the external email client.
   */
  async openEmailApp(jobId: string): Promise<void> {
    const [job, draft] = await Promise.all([
      jobRepository.getJob(jobId),
      emailRepository.getDraftByJobId(jobId),
    ]);

    if (!job || !draft) {
      throw new Error('Application or draft details missing.');
    }

    // Launch email intent
    await emailComposerService.openEmailApp({
      recipient: draft.recipient,
      subject: draft.subject,
      body: draft.body,
      signature: draft.signature,
      attachmentUri: draft.resumeFilePath || undefined,
    });

    // Update workflow state to EMAIL_OPENED
    await jobRepository.updateWorkflowState(jobId, 'EMAIL_OPENED');
  },

  /**
   * Confirms send: Updates application status to Applied and records timestamp.
   */
  async confirmApplicationSent(jobId: string): Promise<void> {
    await jobRepository.updateJobStatus(jobId, 'Applied');
  },
};
