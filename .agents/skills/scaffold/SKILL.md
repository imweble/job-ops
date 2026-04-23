# Skill: scaffold

Generate boilerplate files and folder structures for new features, modules, or components based on project conventions.

## Overview

The `scaffold` skill analyzes existing project structure and coding patterns, then generates consistent boilerplate code for new entities. It reduces repetitive setup work and enforces architectural conventions across the codebase.

## Trigger Conditions

This skill activates when:
- A new feature, module, or component needs to be created from scratch
- Repetitive boilerplate patterns are detected across multiple files
- A developer requests generation of standard project structures
- Missing files are detected that should exist based on project conventions

## Scoring

```typescript
/**
 * Calculate how beneficial scaffolding would be for the current context.
 * Higher scores indicate stronger need for scaffolding assistance.
 *
 * @param context - The current project/file context
 * @returns Score between 0 and 1
 */
export function calcScore(context: ScaffoldContext): number {
  let score = 0;

  // Reward when a new module directory exists but lacks standard files
  if (context.missingStandardFiles.length > 0) {
    score += Math.min(context.missingStandardFiles.length * 0.15, 0.45);
  }

  // Reward when similar patterns exist elsewhere in the codebase
  if (context.similarModulesCount >= 2) {
    score += 0.25;
  }

  // Reward when explicitly requested via comment or prompt
  if (context.explicitRequest) {
    score += 0.3;
  }

  // Penalize if files already exist and are non-empty
  if (context.existingFilesCount > 0) {
    score -= context.existingFilesCount * 0.1;
  }

  return Math.max(0, Math.min(1, score));
}
```

## Eligibility

```typescript
/**
 * Determine whether the scaffold skill should run in the current context.
 *
 * @param context - The current project/file context
 * @returns true if scaffolding is appropriate
 */
export function isEligible(context: ScaffoldContext): boolean {
  // Must have a defined project structure to reference
  if (!context.hasProjectConventions) {
    return false;
  }

  // Avoid scaffolding into already-populated directories
  if (context.targetDirectoryFileCount > 5) {
    return false;
  }

  // Must have a target name or path to scaffold into
  if (!context.targetName || context.targetName.trim().length === 0) {
    return false;
  }

  return calcScore(context) >= 0.3;
}
```

## Process

```typescript
/**
 * Execute the scaffold skill: generate files based on detected conventions.
 *
 * @param context - The current project/file context
 * @returns Array of generated file descriptors
 */
export function process(context: ScaffoldContext): ScaffoldResult[] {
  if (!isEligible(context)) {
    return [];
  }

  const results: ScaffoldResult[] = [];
  const template = resolveTemplate(context);

  for (const fileTemplate of template.files) {
    const rendered = renderTemplate(fileTemplate, {
      name: context.targetName,
      modulePath: context.targetPath,
      timestamp: new Date().toISOString(),
      author: context.authorName ?? 'unknown',
    });

    results.push({
      path: rendered.path,
      content: rendered.content,
      overwrite: false, // never silently overwrite existing files
    });
  }

  return results;
}
```

## Types

```typescript
interface ScaffoldContext {
  /** Name of the module/component to scaffold */
  targetName: string;
  /** Destination path for generated files */
  targetPath: string;
  /** Whether the project has detectable conventions */
  hasProjectConventions: boolean;
  /** Number of files already in the target directory */
  targetDirectoryFileCount: number;
  /** Standard files expected but not yet present */
  missingStandardFiles: string[];
  /** Number of similar existing modules for pattern reference */
  similarModulesCount: number;
  /** Whether scaffolding was explicitly requested */
  explicitRequest: boolean;
  /** Number of non-empty files already at target */
  existingFilesCount: number;
  /** Optional author name for file headers */
  authorName?: string;
}

interface ScaffoldResult {
  path: string;
  content: string;
  overwrite: boolean;
}
```

## Examples

### Input
A developer creates a new directory `src/features/notifications/` with no files.

### Output
The skill generates:
- `src/features/notifications/index.ts` — public API barrel export
- `src/features/notifications/notifications.service.ts` — business logic stub
- `src/features/notifications/notifications.types.ts` — shared type definitions
- `src/features/notifications/notifications.test.ts` — empty test suite scaffold

## Notes

- Templates are inferred from existing modules; no hardcoded templates are used.
- Files are never overwritten without explicit confirmation.
- Scaffolded files include `// scaffolded by job-ops` header comments for traceability.
- Works best when at least two existing modules share a consistent structure.
