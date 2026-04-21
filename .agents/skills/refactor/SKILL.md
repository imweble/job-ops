# Skill: Refactor

> Improve code structure, readability, and maintainability without changing external behavior.

## Overview

The `refactor` skill analyzes existing TypeScript/JavaScript code and suggests or applies structural improvements. It focuses on reducing complexity, eliminating duplication, improving naming, and applying best practices — all while preserving the original functionality.

---

## When to Use

- Code has grown organically and is hard to follow
- Functions are too long or doing too many things
- There is repeated logic that should be extracted
- Variable/function names are unclear or misleading
- Nesting is too deep
- A module has poor separation of concerns

---

## Scoring

```ts
/**
 * Calculates a refactor quality score for a given code block.
 *
 * Factors considered:
 * - Cyclomatic complexity (lower is better)
 * - Average function length (shorter is better)
 * - Duplication ratio (lower is better)
 * - Naming clarity (heuristic, higher is better)
 *
 * @param complexity - Cyclomatic complexity score (1–50)
 * @param avgFnLength - Average lines per function (1–200)
 * @param duplicationRatio - Fraction of duplicated lines (0.0–1.0)
 * @param namingScore - Naming clarity score (0.0–1.0)
 * @returns A normalized score from 0 (poor) to 100 (excellent)
 */
export function calcScore(
  complexity: number,
  avgFnLength: number,
  duplicationRatio: number,
  namingScore: number
): number {
  const complexityScore = Math.max(0, 100 - (complexity - 1) * 2);
  const lengthScore = Math.max(0, 100 - (avgFnLength - 5) * 1.5);
  const duplicationScore = Math.max(0, 100 - duplicationRatio * 100);
  const namingScoreNormalized = namingScore * 100;

  const weighted =
    complexityScore * 0.35 +
    lengthScore * 0.25 +
    duplicationScore * 0.25 +
    namingScoreNormalized * 0.15;

  return Math.round(Math.min(100, Math.max(0, weighted)));
}
```

---

## Strategies

### 1. Extract Function
Move a block of logic into a named function with a clear responsibility.

**Before:**
```ts
const results = items
  .filter(i => i.status === 'active' && i.score > 50)
  .map(i => ({ ...i, label: i.name.trim().toLowerCase() }));
```

**After:**
```ts
function isEligible(item: Item): boolean {
  return item.status === 'active' && item.score > 50;
}

function normalize(item: Item): NormalizedItem {
  return { ...item, label: item.name.trim().toLowerCase() };
}

const results = items.filter(isEligible).map(normalize);
```

---

### 2. Flatten Nesting
Reduce arrow-shaped code by using early returns or guard clauses.

**Before:**
```ts
function process(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.role === 'admin') {
        doAdminThing(user);
      }
    }
  }
}
```

**After:**
```ts
function process(user: User | null) {
  if (!user) return;
  if (!user.isActive) return;
  if (user.role !== 'admin') return;

  doAdminThing(user);
}
```

---

### 3. Replace Magic Values
Replace inline literals with named constants.

**Before:**
```ts
if (score > 75) grantAccess();
```

**After:**
```ts
const ACCESS_THRESHOLD = 75;

if (score > ACCESS_THRESHOLD) grantAccess();
```

---

### 4. Consolidate Duplicate Logic
Identify repeated patterns and extract them into shared utilities.

---

### 5. Improve Naming
- Avoid single-letter variables outside of loop indices
- Use verb-noun naming for functions: `fetchUser`, `parseDate`, `validateInput`
- Use noun naming for values: `userList`, `errorMessage`, `jobCount`

---

## Checklist

- [ ] No function exceeds 40 lines
- [ ] Cyclomatic complexity per function is ≤ 10
- [ ] No logic is duplicated across 3+ locations
- [ ] All variables and functions have descriptive names
- [ ] Side effects are isolated and clearly labeled
- [ ] Types are explicit where inference is ambiguous
- [ ] Tests still pass after refactor

---

## Integration

This skill pairs well with:
- **audit** — identify what needs refactoring
- **document** — update docs after structural changes
- **critique** — validate that refactors don't introduce regressions
- **clarify** — improve naming and comments as part of the refactor

---

## Notes

- Refactoring should never change observable behavior
- Always run tests before and after
- Small, incremental refactors are safer than large rewrites
- Prefer readability over cleverness
