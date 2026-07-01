---
name: bugfix-debug
description: Debug and fix issues in an existing SPFx codebase with minimal, evidence-based changes.
---

# Bugfix Debug

Use this skill for runtime errors, build errors, SPFx serve/package issues, API failures, or UI bugs.

## Process

1. Reproduce or inspect the exact error.
2. Read stack trace, terminal output, browser console, network error, or failing test.
3. Find the smallest code path that explains the bug.
4. Compare against nearby working code.
5. Patch the root cause, not symptoms.
6. Validate with the smallest relevant command.

## Rules

- Do not rewrite large modules to fix a small bug.
- Do not change data contracts unless the bug proves the contract is wrong and the user confirms it.
- Do not hide errors with broad catch blocks.
- Do not add arbitrary delays or retries unless there is a clear reason.
- Keep debug logs out of final code unless the repo has a logging pattern.

## Output

```text
Observed issue:
Root cause:
Fix:
Files changed:
Validation:
Risk:
```
