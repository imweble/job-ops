# Skill: Test

Generate or improve test coverage for TypeScript source files. This skill analyzes existing code and produces meaningful unit/integration tests using common testing frameworks.

---

## Trigger Conditions

Activate this skill when:
- A source file has no corresponding test file
- Test coverage for a file is below a threshold (e.g., < 60%)
- A function has been recently refactored or added
- CI reports failing or missing tests

---

## Scoring

```ts
/**
 * Calculate how urgently a file needs test generation.
 * Higher score = higher priority.
 *
 * @param filePath - Path to the source file
 * @param coveragePercent - Existing test coverage (0–100)
 * @param hasTestFile - Whether a test file already exists
 * @param exportCount - Number of exported symbols in the file
 * @returns Priority score between 0 and 1
 */
export function calcScore(
  filePath: string,
  coveragePercent: number,
  hasTestFile: boolean,
  exportCount: number
): number {
  if (exportCount === 0) return 0;

  const coverageDeficit = Math.max(0, 100 - coveragePercent) / 100;
  const noTestPenalty = hasTestFile ? 0 : 0.3;
  const exportWeight = Math.min(exportCount / 10, 1) * 0.2;

  return Math.min(1, coverageDeficit * 0.5 + noTestPenalty + exportWeight);
}
```

---

## Eligibility

```ts
/**
 * Determine whether a file is eligible for test generation.
 *
 * @param filePath - Path to the source file
 * @param isTestFile - Whether the file itself is already a test
 * @param exportCount - Number of exported symbols
 * @returns true if the file should be considered for test generation
 */
export function isEligible(
  filePath: string,
  isTestFile: boolean,
  exportCount: number
): boolean {
  if (isTestFile) return false;
  if (exportCount === 0) return false;
  if (filePath.includes('node_modules')) return false;
  if (filePath.endsWith('.d.ts')) return false;
  return true;
}
```

---

## Process

```ts
import * as fs from 'fs';
import * as path from 'path';

interface TestGenOptions {
  framework: 'jest' | 'vitest' | 'mocha';
  outputDir?: string;
  dryRun?: boolean;
}

/**
 * Generate a test file scaffold for the given source file.
 *
 * @param sourcePath - Absolute path to the TypeScript source file
 * @param exportedNames - List of exported function/class names to test
 * @param options - Configuration for test generation
 * @returns The generated test file content as a string
 */
export function process(
  sourcePath: string,
  exportedNames: string[],
  options: TestGenOptions
): string {
  const { framework = 'vitest', outputDir, dryRun = false } = options;

  const relImport = path
    .relative(outputDir ?? path.dirname(sourcePath), sourcePath)
    .replace(/\.ts$/, '');

  const importLine =
    framework === 'mocha'
      ? `import { ${exportedNames.join(', ')} } from '${relImport}';`
      : `import { ${exportedNames.join(', ')} } from '${relImport}';`;

  const describeBlock = [
    importLine,
    '',
    `describe('${path.basename(sourcePath, '.ts')}', () => {`,
    ...exportedNames.map(
      (name) =>
        `  it('${name} should be defined', () => {\n    expect(${name}).toBeDefined();\n  });`
    ),
    '});',
  ].join('\n');

  if (!dryRun && outputDir) {
    const outFile = path.join(
      outputDir,
      path.basename(sourcePath).replace(/\.ts$/, '.test.ts')
    );
    fs.writeFileSync(outFile, describeBlock, 'utf-8');
  }

  return describeBlock;
}
```

---

## Notes

- Prefer `vitest` for Vite-based projects; fall back to `jest` for CRA/Node projects.
- Generated tests are scaffolds — they assert existence and basic types. Developers should enrich them with domain-specific assertions.
- When `dryRun: true`, no files are written; the generated content is returned for preview.
- Pair this skill with **audit** to identify coverage gaps and **refactor** to ensure testable code structure.
