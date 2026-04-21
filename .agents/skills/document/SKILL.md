# Document Skill

Automatically generates, improves, and maintains documentation for code, APIs, and project components.

## Overview

The `document` skill analyzes existing code and generates meaningful, accurate documentation including JSDoc comments, README sections, API references, and inline explanations. It ensures documentation stays consistent with the actual implementation.

## Triggers

- `document this`
- `add docs`
- `generate documentation`
- `document the API`
- `add jsdoc`
- `write docs for`
- `explain this code`
- `document function`

## Behavior

### Input Analysis

The skill inspects:

1. **Function signatures** — parameter names, types, return types
2. **Class structures** — constructor, public methods, properties
3. **Module exports** — what is exposed and how it's intended to be used
4. **Existing comments** — partial docs that need expansion
5. **Usage patterns** — how the code is called elsewhere in the project

### Output Formats

#### JSDoc (TypeScript / JavaScript)

```typescript
/**
 * Fetches a paginated list of job applications for a given user.
 *
 * @param userId - The unique identifier of the user whose applications to fetch
 * @param options - Optional pagination and filter configuration
 * @param options.page - Page number (1-indexed). Defaults to 1.
 * @param options.limit - Number of results per page. Defaults to 20.
 * @param options.status - Filter by application status
 * @returns A promise resolving to a paginated result containing job applications
 *
 * @example
 * const result = await getApplications('user-123', { page: 2, limit: 10 });
 * console.log(result.data); // JobApplication[]
 */
async function getApplications(
  userId: string,
  options?: GetApplicationsOptions
): Promise<PaginatedResult<JobApplication>> {
  // ...
}
```

#### README Sections

When documenting a module or feature, the skill produces structured Markdown:

```markdown
## Job Applications API

Manage job applications for authenticated users.

### Methods

| Method | Description |
|--------|-------------|
| `getApplications(userId, options?)` | Fetch paginated applications |
| `createApplication(data)` | Submit a new application |
| `updateStatus(id, status)` | Update application status |

### Usage

```ts
import { getApplications } from '@/lib/applications';
```
```

#### Inline Comments

For complex logic blocks:

```typescript
// Normalize the status field to handle legacy 'applied' vs new 'submitted' values
const normalizedStatus = status === 'applied' ? 'submitted' : status;
```

## Rules

1. **Accuracy first** — Documentation must reflect what the code actually does, not what it should do.
2. **No redundancy** — Avoid comments that merely restate the code (`// increment i` above `i++`).
3. **Include examples** — Every public API function should have at least one `@example` block.
4. **Type everything** — All `@param` and `@returns` tags must include TypeScript types.
5. **Keep it concise** — Descriptions should be one to two sentences unless complexity demands more.
6. **Document edge cases** — Note when parameters are optional, what defaults apply, and what errors may be thrown.
7. **Preserve existing docs** — When improving existing documentation, retain accurate content and only amend or extend.

## Workflow

```
analyze code structure
  ↓
identify undocumented or poorly documented symbols
  ↓
infer intent from names, types, and usage
  ↓
draft documentation
  ↓
validate against implementation
  ↓
output documentation in appropriate format
```

## Integration with Other Skills

- **audit** — Use audit findings to identify which symbols lack documentation
- **clarify** — When intent is ambiguous, apply clarify before documenting
- **critique** — After generating docs, critique can review for clarity and completeness
- **adapt** — When APIs change, document updates existing docs to match

## Examples

### Before

```typescript
export function calcScore(apps: Application[], weights: Record<string, number>) {
  return apps.map(a => {
    const base = weights[a.role] ?? 1;
    return { ...a, score: a.matchPercent * base };
  });
}
```

### After

```typescript
/**
 * Calculates weighted relevance scores for a list of job applications.
 *
 * Each application's `matchPercent` is multiplied by a role-specific weight.
 * If no weight is defined for a role, a default weight of 1 is used.
 *
 * @param apps - Array of job applications to score
 * @param weights - Map of role names to numeric weight multipliers
 * @returns A new array of applications with an added `score` property
 *
 * @example
 * const scored = calcScore(applications, { engineer: 1.5, designer: 1.2 });
 * // scored[0].score === applications[0].matchPercent * 1.5
 */
export function calcScore(
  apps: Application[],
  weights: Record<string, number>
): ScoredApplication[] {
  return apps.map(a => {
    const base = weights[a.role] ?? 1;
    return { ...a, score: a.matchPercent * base };
  });
}
```
