# Skill: debug

Identifies, diagnoses, and resolves bugs, runtime errors, and logical issues in TypeScript/JavaScript code.

## Trigger Conditions

This skill activates when:
- A file contains `TODO: fix`, `FIXME`, `BUG`, or `HACK` comments
- TypeScript compiler errors are present in a file
- A function has known edge cases that are unhandled (null/undefined, empty arrays, out-of-bounds)
- Test failures are detected referencing a specific module
- Console.error or thrown errors are found without proper handling

## Scoring (`calcScore`)

```ts
function calcScore(file: FileContext): number {
  let score = 0;

  // Heavily penalise known error markers
  const fixmeCount = (file.content.match(/FIXME|BUG|HACK/g) || []).length;
  score += fixmeCount * 20;

  // Penalise unhandled promise rejections
  const unhandledPromises = (
    file.content.match(/\.catch\s*\(\s*\)/g) || []
  ).length;
  score += unhandledPromises * 15;

  // Penalise broad any-typed catches
  const anyCatch = (file.content.match(/catch\s*\(\s*e\s*:\s*any\)/g) || [])
    .length;
  score += anyCatch * 10;

  // Penalise missing null guards on optional chaining candidates
  const unsafeAccess = (
    file.content.match(/\w+\.\w+(?<!\?)(?=\s*[\[.(])/g) || []
  ).length;
  score += Math.min(unsafeAccess * 2, 30);

  // Reward files that already have try/catch blocks (partially handled)
  const tryCatchCount = (file.content.match(/try\s*\{/g) || []).length;
  score -= tryCatchCount * 5;

  return Math.max(0, Math.min(score, 100));
}
```

## Eligibility (`isEligible`)

```ts
function isEligible(file: FileContext): boolean {
  // Only process TypeScript and JavaScript source files
  if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) return false;

  // Skip test files — the `test` skill handles those
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file.path)) return false;

  // Skip generated or vendored files
  if (/node_modules|\.generated\.|dist\//.test(file.path)) return false;

  return calcScore(file) >= 15;
}
```

## Process (`process`)

```ts
async function process(file: FileContext, llm: LLMClient): Promise<Patch[]> {
  const prompt = `
You are a senior TypeScript engineer performing a targeted bug-fix review.

File: ${file.path}

\`\`\`typescript
${file.content}
\`\`\`

Tasks:
1. Identify all runtime errors, unhandled edge cases, and logic bugs.
2. For each issue, provide a minimal, focused fix — do not refactor unrelated code.
3. Add a short inline comment explaining WHY the fix is necessary.
4. Preserve existing formatting and style conventions.
5. Do NOT change function signatures unless required to fix a bug.

Return a unified diff patch only. No explanations outside the diff.
`;

  const response = await llm.complete(prompt);
  return parseDiff(response);
}
```

## Examples

### Before

```ts
async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return data.user.profile.name; // BUG: no null check
}
```

### After

```ts
async function fetchUser(id: string): Promise<string | null> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    // Guard against non-2xx responses before parsing JSON
    throw new Error(`Failed to fetch user ${id}: ${res.status}`);
  }
  const data = await res.json();
  // Optional chaining prevents crash when nested fields are absent
  return data?.user?.profile?.name ?? null;
}
```

## Notes

- This skill focuses on **correctness**, not style or performance.
- For performance issues, prefer the `optimize` skill.
- For broad code quality concerns, prefer the `refactor` skill.
- Patches produced by this skill should be small and surgical.
- Always verify that existing tests still pass after applying a debug patch.
