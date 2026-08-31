import { runWorkflowOrchestrationTests } from '../src/services/workflow/__tests__/workflowOrchestrator.test';

const res = runWorkflowOrchestrationTests();

if (res.failed > 0) {
  console.error(`\nFAILED: ${res.failed}/${res.total} tests failed.\n`);
  process.exit(1);
} else {
  console.log(`\nAll ${res.passed}/${res.total} workflow orchestration tests passed successfully!\n`);
  process.exit(0);
}
