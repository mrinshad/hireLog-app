import { CompilerError, latexCompiler } from '../compiler';

export async function runCompilerTests(): Promise<{ total: number; passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${testName}`);
      failed++;
    }
  }

  console.log('\n--- Running LaTeX Compiler & PDF Service Tests ---');

  // Test 1: CompilerError structure preserves logs
  {
    const err = new CompilerError('Compilation failed', '! Undefined control sequence \n l.25 \\brokenCommand');
    assert(
      err.message === 'Compilation failed' &&
        err.compilerLog.includes('\\brokenCommand') &&
        err.name === 'CompilerError',
      'Test 1: CompilerError structure preserves detailed logs for debugging'
    );
  }

  // Test 2: Error instance conforms to standard Error
  {
    const err = new CompilerError('On-device error');
    assert(
      err instanceof Error && err.name === 'CompilerError',
      'Test 2: CompilerError extends Error correctly'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
