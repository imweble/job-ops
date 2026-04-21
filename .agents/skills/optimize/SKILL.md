# Optimize Skill

Reduces bundle size, improves runtime performance, and eliminates redundant logic in TypeScript/React codebases.

## Trigger

Use this skill when:
- Bundle size is too large
- Components re-render unnecessarily
- Database queries are slow or duplicated
- Functions run in O(n²) when O(n) is possible
- Memory usage is excessive

## Process

```
analyze → profile → identify bottlenecks → apply fixes → verify
```

### 1. Analyze

Scan the target file or module for known performance anti-patterns:

- Inline object/array literals in JSX props (causes re-renders)
- Missing `useMemo` / `useCallback` for expensive computations
- `Array.find` inside render loops
- Unindexed database lookups
- Importing entire libraries when only one export is needed
- Synchronous operations that should be async
- Duplicate API calls that could be cached

### 2. Profile

Estimate the impact of each issue:

| Severity | Description                              |
|----------|------------------------------------------|
| critical | Blocks UI thread > 100ms                 |
| high     | Causes unnecessary network round-trips   |
| medium   | Triggers avoidable re-renders            |
| low      | Minor memory or CPU inefficiency         |

### 3. Identify Bottlenecks

For each file passed to the skill, run `calcScore` to produce a numeric performance debt score.

```typescript
/**
 * Calculates a performance debt score for a given source file.
 * Higher score = more optimization needed.
 *
 * @param source - Raw TypeScript/TSX source code
 * @returns A score between 0 (optimal) and 100 (critical)
 */
export function calcScore(source: string): number {
  let score = 0;

  const patterns: Array<{ regex: RegExp; weight: number }> = [
    { regex: /style={{/g,                          weight: 3  }, // inline style objects
    { regex: /onClick={\s*\(/g,                    weight: 4  }, // inline arrow in JSX
    { regex: /\.find\(/g,                          weight: 2  }, // linear search
    { regex: /import \* as/g,                      weight: 5  }, // namespace import
    { regex: /JSON\.parse\(JSON\.stringify/g,       weight: 8  }, // deep clone anti-pattern
    { regex: /useEffect\([^,]+\[\]\)/g,            weight: 2  }, // empty dep array smell
    { regex: /console\.log/g,                      weight: 1  }, // leftover debug logs
    { regex: /await.*await/g,                      weight: 6  }, // sequential awaits
  ];

  for (const { regex, weight } of patterns) {
    const matches = source.match(regex);
    if (matches) {
      score += matches.length * weight;
    }
  }

  return Math.min(score, 100);
}
```

### 4. Apply Fixes

Transformations applied automatically when `isEligible` returns `true`:

```typescript
/**
 * Determines whether a file is a candidate for automated optimization.
 *
 * Files are eligible when:
 * - They are TypeScript or TSX
 * - calcScore returns >= 10
 * - They are not inside node_modules or .next
 *
 * @param filePath - Relative path to the file
 * @param score    - Pre-computed calcScore result
 */
export function isEligible(filePath: string, score: number): boolean {
  const excluded = ["node_modules", ".next", "dist", ".agents"];
  const isExcluded = excluded.some((dir) => filePath.includes(dir));
  const isTS = /\.(ts|tsx)$/.test(filePath);
  return isTS && !isExcluded && score >= 10;
}
```

#### Common Transformations

**Memoize expensive derived values**
```tsx
// Before
const sorted = items.sort((a, b) => a.date - b.date);

// After
const sorted = useMemo(
  () => [...items].sort((a, b) => a.date - b.date),
  [items]
);
```

**Parallelize independent awaits**
```typescript
// Before
const user = await fetchUser(id);
const jobs  = await fetchJobs(id);

// After
const [user, jobs] = await Promise.all([fetchUser(id), fetchJobs(id)]);
```

**Replace namespace imports with named imports**
```typescript
// Before
import * as _ from "lodash";

// After
import { debounce, throttle } from "lodash";
```

### 5. Verify

After applying fixes:

1. Re-run `calcScore` — new score must be lower than original.
2. Confirm TypeScript compilation passes (`tsc --noEmit`).
3. Run existing test suite; no regressions allowed.
4. If the fix involves React hooks, confirm hook rules are satisfied.

## Output Format

Return a structured report:

```
Optimize Report — src/components/JobCard.tsx
─────────────────────────────────────────────
Original score : 34
Final score    : 8
Improvements   : 4

  [high]   Parallelized 2 sequential awaits in fetchJobDetails
  [medium] Wrapped sortedApplications in useMemo (3 deps)
  [medium] Moved onClick handler to useCallback
  [low]    Removed 3 console.log statements

Status: ✅ All checks passed
```

## Boundaries

- Do **not** change public API signatures.
- Do **not** remove comments or documentation.
- Do **not** optimize test files — only source files.
- Do **not** add third-party dependencies to achieve optimization.
- Prefer readability over micro-optimizations (< 1ms gains).

## Related Skills

- **refactor** — structural cleanup without performance focus
- **audit**    — security and quality checks
- **bolder**   — design confidence improvements
