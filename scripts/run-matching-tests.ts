import { runMatchingEngineTests } from '../src/services/matching/__tests__/matchingEngine.test';

const { total, passed, failed } = runMatchingEngineTests();

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`All ${passed}/${total} matching engine tests passed successfully!`);
}
