# Skill: cleanup

Removes dead code, unused imports, redundant comments, and stale feature flags from TypeScript/JavaScript files.

## Trigger Conditions

This skill activates when a file scores above the eligibility threshold across the metrics below.

## Scoring Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| unusedImports | 0.30 | Imports that are never referenced in the file |
| deadCode | 0.25 | Unreachable branches, commented-out code blocks |
| staleFlags | 0.20 | Feature flags / env checks that are always-true or always-false |
| redundantComments | 0.15 | Comments that merely restate what the code already says |
| emptyBlocks | 0.10 | Empty catch blocks, empty if-bodies, no-op arrow functions |

## calcScore

```typescript
interface CleanupMetrics {
  unusedImports: number;   // 0-1
  deadCode: number;        // 0-1
  staleFlags: number;      // 0-1
  redundantComments: number; // 0-1
  emptyBlocks: number;     // 0-1
}

function calcScore(metrics: CleanupMetrics): number {
  const weights = {
    unusedImports: 0.30,
    deadCode: 0.25,
    staleFlags: 0.20,
    redundantComments: 0.15,
    emptyBlocks: 0.10,
  };

  return (
    metrics.unusedImports   * weights.unusedImports +
    metrics.deadCode        * weights.deadCode +
    metrics.staleFlags      * weights.staleFlags +
    metrics.redundantComments * weights.redundantComments +
    metrics.emptyBlocks     * weights.emptyBlocks
  );
}
```

## isEligible

A file is eligible for cleanup when its score meets or exceeds **0.25**.

```typescript
const CLEANUP_THRESHOLD = 0.25;

function isEligible(metrics: CleanupMetrics): boolean {
  return calcScore(metrics) >= CLEANUP_THRESHOLD;
}
```

## process

Applies cleanup transformations in a deterministic order to avoid cascading edits:

1. **Remove unused imports** — parse the import list and drop any identifier not referenced in the file body.
2. **Delete dead code** — remove unreachable statements after `return`/`throw`, and large commented-out blocks (≥ 3 consecutive comment lines).
3. **Resolve stale flags** — inline the always-taken branch of a feature-flag conditional and delete the other branch.
4. **Strip redundant comments** — remove single-line comments whose text is a direct paraphrase of the following statement.
5. **Fill empty blocks** — replace empty `catch` blocks with a minimal `// intentionally ignored` note, or remove the try/catch if the body is also empty.

```typescript
interface CleanupResult {
  modified: boolean;
  removedImports: string[];
  removedLines: number;
  resolvedFlags: string[];
  warnings: string[];
}

function process(filePath: string, source: string): CleanupResult {
  const result: CleanupResult = {
    modified: false,
    removedImports: [],
    removedLines: 0,
    resolvedFlags: [],
    warnings: [],
  };

  // Each transformation returns the updated source and a diff summary.
  let current = source;

  const afterImports = removeUnusedImports(current);
  result.removedImports = afterImports.removed;
  current = afterImports.source;

  const afterDead = removeDeadCode(current);
  result.removedLines += afterDead.linesRemoved;
  current = afterDead.source;

  const afterFlags = resolveStaleFlags(current);
  result.resolvedFlags = afterFlags.resolved;
  result.warnings.push(...afterFlags.warnings);
  current = afterFlags.source;

  const afterComments = stripRedundantComments(current);
  result.removedLines += afterComments.linesRemoved;
  current = afterComments.source;

  const afterBlocks = fixEmptyBlocks(current);
  current = afterBlocks.source;

  result.modified = current !== source;
  return result;
}
```

## Output Contract

- The transformed source must remain **syntactically valid** TypeScript.
- No behavioural changes are permitted — only cosmetic / structural removal.
- If a transformation would alter runtime behaviour, it is skipped and a warning is added to `result.warnings`.
- The skill must be **idempotent**: running it twice on the same file produces the same output.

## Example

**Before**
```typescript
import { useState, useEffect, useCallback } from 'react'; // useCallback never used
import { format } from 'date-fns';

const FLAG_NEW_DASHBOARD = true; // always true

function Dashboard() {
  // render the dashboard
  if (FLAG_NEW_DASHBOARD) {
    return <NewDashboard />;
  } else {
    return <OldDashboard />; // dead branch
  }
}
```

**After**
```typescript
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

function Dashboard() {
  return <NewDashboard />;
}
```
