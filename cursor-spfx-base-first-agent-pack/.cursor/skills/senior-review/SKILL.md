---
name: senior-review
description: Review SPFx/TypeScript/React changes like a senior architect, focused on correctness and fit with the existing base.
---

# Senior Review

Use this skill to review a diff, PR, or proposed patch.

## Review focus

- Does the change follow the existing architecture?
- Did it invent business/data model without user input?
- Does it compile with current SPFx/React/TypeScript versions?
- Are permissions and client-side authorization handled safely?
- Are async flows, errors, loading, empty states, and cleanup handled?
- Are types precise enough?
- Are tests or validation adequate?
- Is the diff smaller than necessary?

## Severity

- Blocker: must fix before merge.
- Major: should fix before merge unless accepted risk.
- Minor: cleanup/readability.
- Note: context or suggestion.

## Output format

```text
Verdict: approve / approve with comments / request changes

Blockers
- file:line - issue - suggested fix

Major
- file:line - issue - suggested fix

Minor
- file:line - issue - suggested fix

Good parts
- ...

Validation gaps
- ...
```
