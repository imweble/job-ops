# Security Skill

Detects and flags potential security vulnerabilities in TypeScript/JavaScript code, including dependency issues, insecure patterns, and common OWASP concerns.

## Triggers

- Files containing `fetch`, `axios`, `http`, `https` imports
- Files with `eval`, `innerHTML`, `dangerouslySetInnerHTML`
- Files with environment variable access (`process.env`)
- Files with authentication/authorization logic
- `package.json` with outdated or vulnerable dependencies
- Files matching `**/auth/**`, `**/api/**`, `**/middleware/**`

## Scoring

```typescript
function calcScore(file: FileContext): number {
  let score = 0;

  // High-risk patterns
  const highRisk = [
    /eval\s*\(/,
    /innerHTML\s*=/,
    /dangerouslySetInnerHTML/,
    /document\.write\s*\(/,
    /new\s+Function\s*\(/,
  ];

  // Medium-risk patterns
  const mediumRisk = [
    /process\.env\.[A-Z_]+/,
    /Math\.random\s*\(/,
    /http:\/\//,
    /localStorage\.setItem/,
    /sessionStorage\.setItem/,
  ];

  // Auth-related files score higher
  const authPatterns = [
    /auth/i,
    /login/i,
    /password/i,
    /token/i,
    /secret/i,
    /credential/i,
  ];

  for (const pattern of highRisk) {
    if (pattern.test(file.content)) score += 30;
  }

  for (const pattern of mediumRisk) {
    if (pattern.test(file.content)) score += 15;
  }

  for (const pattern of authPatterns) {
    if (pattern.test(file.path) || pattern.test(file.content)) {
      score += 10;
      break;
    }
  }

  // Cap at 100
  return Math.min(score, 100);
}
```

## Eligibility

```typescript
function isEligible(file: FileContext): boolean {
  const eligibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
  const ext = path.extname(file.path);

  if (!eligibleExtensions.includes(ext)) return false;

  // Skip test files and mocks
  if (/\.(test|spec|mock)\.[tj]sx?$/.test(file.path)) return false;

  // Skip generated files
  if (file.path.includes('node_modules')) return false;
  if (file.path.includes('.next/')) return false;
  if (file.path.includes('dist/')) return false;

  return true;
}
```

## Process

```typescript
function process(file: FileContext): SecurityReport {
  const issues: SecurityIssue[] = [];

  const checks: Array<{
    pattern: RegExp;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    suggestion: string;
  }> = [
    {
      pattern: /eval\s*\(/g,
      severity: 'critical',
      message: 'Use of eval() is dangerous and can lead to code injection',
      suggestion: 'Replace eval() with safer alternatives like JSON.parse() or Function constructors with strict input validation',
    },
    {
      pattern: /innerHTML\s*=/g,
      severity: 'high',
      message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
      suggestion: 'Use textContent for plain text, or sanitize HTML with DOMPurify before assigning to innerHTML',
    },
    {
      pattern: /dangerouslySetInnerHTML/g,
      severity: 'high',
      message: 'dangerouslySetInnerHTML bypasses React XSS protection',
      suggestion: 'Sanitize content with DOMPurify or use a safe rendering library',
    },
    {
      pattern: /Math\.random\s*\(/g,
      severity: 'medium',
      message: 'Math.random() is not cryptographically secure',
      suggestion: 'Use crypto.getRandomValues() or crypto.randomUUID() for security-sensitive operations',
    },
    {
      pattern: /http:\/\//g,
      severity: 'medium',
      message: 'Insecure HTTP connection detected',
      suggestion: 'Use HTTPS for all external connections to prevent man-in-the-middle attacks',
    },
    {
      pattern: /console\.(log|debug|info).*(?:password|token|secret|key)/gi,
      severity: 'high',
      message: 'Potential sensitive data being logged to console',
      suggestion: 'Remove logging of sensitive data; use structured logging with redaction in production',
    },
    {
      pattern: /(?:password|secret|apiKey|api_key)\s*[:=]\s*['"][^'"]{8,}['"]/g,
      severity: 'critical',
      message: 'Hardcoded secret or credential detected',
      suggestion: 'Move secrets to environment variables and use a secrets manager in production',
    },
  ];

  for (const check of checks) {
    const matches = [...file.content.matchAll(check.pattern)];
    for (const match of matches) {
      const lineNumber = file.content
        .substring(0, match.index)
        .split('\n').length;

      issues.push({
        severity: check.severity,
        message: check.message,
        suggestion: check.suggestion,
        line: lineNumber,
        column: (match.index ?? 0) - file.content.lastIndexOf('\n', match.index),
        snippet: match[0],
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;

  return {
    file: file.path,
    issues,
    summary: {
      critical: criticalCount,
      high: highCount,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
      total: issues.length,
    },
    passed: criticalCount === 0 && highCount === 0,
  };
}
```

## Output Format

For each issue found:

```
🔴 CRITICAL | Line 42 | Hardcoded secret detected
   Found: `apiKey: "sk-abc123..."`
   Fix: Move secrets to environment variables and use a secrets manager in production

🟠 HIGH | Line 87 | Direct innerHTML assignment can lead to XSS
   Found: `element.innerHTML = userInput`
   Fix: Use textContent for plain text, or sanitize HTML with DOMPurify
```

## Notes

- This skill is advisory — it does not auto-fix security issues
- Always review findings in context; some patterns may be intentional or already mitigated
- For dependency scanning, defer to `npm audit` or Snyk integration
- Pair with the `audit` skill for a broader code quality perspective
