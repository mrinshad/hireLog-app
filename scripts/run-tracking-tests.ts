import { runTrackingTests } from '../src/services/tracking/__tests__/applicationTracking.test';

const { total, passed, failed } = runTrackingTests();

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`All ${passed}/${total} Application Tracking tests passed successfully!`);
}
