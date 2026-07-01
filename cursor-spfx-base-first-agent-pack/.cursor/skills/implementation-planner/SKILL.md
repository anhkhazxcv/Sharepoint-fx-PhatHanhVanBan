---
name: implementation-planner
description: Create a small, safe implementation plan based on the existing codebase before editing.
---

# Implementation Planner

Use this skill before implementing a feature or change.

## Non-negotiables

- Do not invent business rules or data model.
- Do not introduce new dependencies without explicit approval.
- Do not perform wide refactors while implementing a feature.
- Do not change public contracts unless required and explained.

## Plan checklist

1. Restate the user requirement in implementation terms.
2. List files/patterns found in the current repo.
3. Identify which files will be changed.
4. Identify missing user-provided business/data facts.
5. Define validation steps using package.json scripts.
6. Call out risks before editing.

## Output format

```text
Understanding
- Requirement:
- Existing pattern to follow:

Plan
1.
2.
3.

Files to change
- path: reason

Missing decisions
- none / list items

Validation
- command(s):

Risk
- low/medium/high + reason
```
