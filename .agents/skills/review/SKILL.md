# Skill: review

Performs automated code review on changed files, surfacing issues related to code quality, security, maintainability, and best practices.

## Trigger

Run this skill when:
- A pull request is opened or updated
- A file is flagged for peer review
- The user asks for a code review

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `files` | `string[]` | yes | Paths to files to review |
| `context` | `string` | no | PR description or surrounding context |
| `severity` | `'low' \| 'medium' \| 'high'` | no | Minimum severity level to report (default: `'low'`) |

## Outputs

| Name | Type | Description |
|------|------|-------------|
| `findings` | `Finding[]` | List of review findings |
| `score` | `number` | Overall review score 0–100 |
| `summary` | `string` | Human-readable summary of the review |

## Algorithm

### `calcScore(findings: Finding[]): number`

Returns a score from 0–100 based on the severity and count of findings.

```
penalty = sum(
  finding.severity === 'high'   ? 20 :
  finding.severity === 'medium' ? 8  :
                                   2
  for each finding
)
score = clamp(100 - penalty, 0, 100)
```

### `isEligible(file: string): boolean`

Returns `true` when the file should be reviewed:

- File extension is one of: `.ts`, `.tsx`, `.js`, `.jsx`
- File is not inside `node_modules`, `dist`, or `.next`
- File size is under 1 000 lines

### `process(files: string[], context?: string, severity?: Severity): ReviewResult`

1. Filter `files` through `isEligible`.
2. For each eligible file:
   a. Parse the file into an AST.
   b. Run each lint rule (see **Rules** below) against the AST.
   c. Collect `Finding` objects for every rule violation at or above `severity`.
3. Compute `score` via `calcScore`.
4. Build `summary` string:
   - If `score >= 90`: "Looks great — minor nits only."
   - If `score >= 70`: "Good shape with a few issues to address."
   - Otherwise: "Needs attention before merging."
5. Return `{ findings, score, summary }`.

## Rules

| ID | Severity | Description |
|----|----------|-------------|
| `no-any` | medium | Avoid `any` type annotations |
| `no-console` | low | Remove `console.log` / `console.error` calls |
| `prefer-const` | low | Use `const` instead of `let` where variable is never reassigned |
| `no-unused-vars` | medium | Remove variables declared but never read |
| `no-hardcoded-secret` | high | Flag strings matching secret patterns (API keys, passwords) |
| `async-await-error-handling` | medium | `await` calls inside `try/catch` or `.catch()` |
| `no-implicit-return` | low | All code paths in a function must return a value |
| `max-function-length` | medium | Functions exceeding 60 lines should be split |

## Types

```typescript
type Severity = 'low' | 'medium' | 'high';

interface Finding {
  file: string;
  line: number;
  column: number;
  ruleId: string;
  severity: Severity;
  message: string;
  suggestion?: string;
}

interface ReviewResult {
  findings: Finding[];
  score: number;
  summary: string;
}
```

## Example

```typescript
const result = await runSkill('review', {
  files: ['src/api/jobs.ts', 'src/utils/format.ts'],
  severity: 'medium',
});

console.log(result.score);   // e.g. 76
console.log(result.summary); // "Good shape with a few issues to address."
console.log(result.findings);
// [
//   { file: 'src/api/jobs.ts', line: 42, ruleId: 'no-any', severity: 'medium', ... },
//   { file: 'src/utils/format.ts', line: 7, ruleId: 'no-console', severity: 'low', ... },
// ]
```

## Notes

- Findings are sorted by severity (high → medium → low) then by file path and line number.
- When `context` is provided it is used to suppress false positives (e.g. a hardcoded secret in a test fixture described in the PR body).
- This skill is read-only; it never modifies files. Use the **refactor** skill to apply suggested fixes.
