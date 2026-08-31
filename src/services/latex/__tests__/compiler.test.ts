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

  // Test 1: Empty LaTeX source throws CompilerError
  try {
    await latexCompiler.compileToPdf('', 'job-1', 'v1');
    assert(false, 'Test 1: Empty LaTeX source should reject');
  } catch (error: any) {
    assert(
      error instanceof CompilerError && error.message.includes('LaTeX source is empty'),
      'Test 1: Empty LaTeX source is caught and throws clean CompilerError'
    );
  }

  // Test 2: Whitespace only throws CompilerError
  try {
    await latexCompiler.compileToPdf('   \n  ', 'job-1', 'v1');
    assert(false, 'Test 2: Whitespace-only LaTeX source should reject');
  } catch (error: any) {
    assert(
      error instanceof CompilerError,
      'Test 2: Whitespace-only LaTeX source is rejected with CompilerError'
    );
  }

  // Test 3: CompilerError structure preserves logs
  {
    const err = new CompilerError('Compilation failed', '! Undefined control sequence \n l.25 \\brokenCommand');
    assert(
      err.message === 'Compilation failed' &&
        err.compilerLog.includes('\\brokenCommand') &&
        err.name === 'CompilerError',
      'Test 3: CompilerError structure preserves detailed logs for debugging without exposing raw logs in main message'
    );
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { total: passed + failed, passed, failed };
}
