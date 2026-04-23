# Skill: migrate

> Identifies and rewrites code patterns that are outdated, deprecated, or incompatible with the current project standards, frameworks, or language versions.

## Overview

The `migrate` skill scans source files for legacy patterns, deprecated API usage, and version-incompatible constructs, then produces updated equivalents that align with the project's current stack.

## Trigger Conditions

This skill activates when:

- A file contains deprecated API calls (e.g., `componentWillMount`, `var`, `require()` in an ESM project)
- A file uses a pattern that has a known modern replacement
- The project has been upgraded (e.g., React 17 → 18, Node 16 → 20, TypeScript 4 → 5)
- Explicit migration notes exist in comments (`// TODO: migrate`, `// DEPRECATED`)
- Import paths reference packages that have been renamed or reorganised

## Score Calculation

```typescript
/**
 * calcScore — returns a value in [0, 1] representing how urgently
 * this file needs migration work.
 *
 * Higher score = more migration debt.
 */
export function calcScore(file: SourceFile): number {
  const hits = [
    countDeprecatedAPIs(file),   // weight 0.4
    countLegacyPatterns(file),   // weight 0.35
    countOutdatedImports(file),  // weight 0.25
  ];

  const weighted =
    hits[0] * 0.4 +
    hits[1] * 0.35 +
    hits[2] * 0.25;

  // Normalise against a ceiling of 20 detected issues
  return Math.min(weighted / 20, 1);
}
```

## Eligibility Check

```typescript
/**
 * isEligible — returns true when the file is a candidate for migration.
 *
 * Skips:
 * - Files inside node_modules or .cache
 * - Auto-generated files (contain `@generated` header)
 * - Files already flagged as migrated in the current session
 */
export function isEligible(file: SourceFile): boolean {
  if (file.path.includes('node_modules') || file.path.includes('.cache')) {
    return false;
  }
  if (file.content.includes('@generated')) {
    return false;
  }
  return calcScore(file) > 0.1;
}
```

## Processing Pipeline

```typescript
/**
 * process — applies migration transforms to a single source file.
 *
 * Returns a MigrationResult describing every change made.
 */
export async function process(
  file: SourceFile,
  context: SkillContext,
): Promise<MigrationResult> {
  const transforms: Transform[] = [
    replaceDeprecatedLifecycles,   // React class component hooks
    convertRequireToImport,        // CJS → ESM
    upgradeTypeAssertions,         // `<Type>val` → `val as Type`
    replaceCallbackWithAsync,      // callback-style → async/await
    updateRenamedPackages,         // e.g. `@types/react` peer adjustments
    dropDefaultExportAntiPattern,  // enforce named exports where policy mandates
  ];

  const changes: Change[] = [];

  let source = file.content;
  for (const transform of transforms) {
    const result = await transform(source, context);
    if (result.changed) {
      source = result.output;
      changes.push(...result.changes);
    }
  }

  return {
    file: file.path,
    originalContent: file.content,
    migratedContent: source,
    changes,
    score: calcScore(file),
  };
}
```

## Output Contract

| Field | Type | Description |
|---|---|---|
| `file` | `string` | Absolute path of the migrated file |
| `originalContent` | `string` | Unmodified source |
| `migratedContent` | `string` | Transformed source |
| `changes` | `Change[]` | Ordered list of individual edits |
| `score` | `number` | Pre-migration debt score (0–1) |

## Example Change Record

```json
{
  "kind": "deprecated-api",
  "line": 42,
  "before": "componentWillMount()",
  "after": "componentDidMount()",
  "rationale": "componentWillMount is removed in React 18"
}
```

## Configuration

Place a `migrate.config.ts` (or JSON equivalent) at the project root to customise behaviour:

```typescript
export default {
  // Minimum score before the skill proposes changes
  threshold: 0.15,

  // Which transform passes to enable
  transforms: {
    replaceDeprecatedLifecycles: true,
    convertRequireToImport: true,
    upgradeTypeAssertions: true,
    replaceCallbackWithAsync: false, // opt-in only
    updateRenamedPackages: true,
    dropDefaultExportAntiPattern: false,
  },

  // Paths to always skip
  ignore: ['src/legacy/**', '**/*.spec.ts'],
};
```

## Integration Notes

- Runs **after** `audit` (which surfaces the issues) and **before** `refactor` (which cleans up structure).
- Changes are staged as a diff for human review; the skill never writes directly to disk without confirmation.
- When `replaceCallbackWithAsync` is enabled, ensure the `test` skill is scheduled immediately afterwards to validate behavioural equivalence.
