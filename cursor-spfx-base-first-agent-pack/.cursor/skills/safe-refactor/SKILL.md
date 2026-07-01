---
name: safe-refactor
description: Refactor existing SPFx code safely without changing behavior or inventing architecture.
---

# Safe Refactor

Use this skill for cleanup, extraction, naming, file movement, or architecture improvement.

## Rules

- Behavior must remain unchanged unless the user explicitly asks for behavior change.
- Keep the diff small.
- Separate refactor commits from feature commits when possible.
- Preserve public props, exports, routes, commands, and API contracts unless the user approves changes.
- Add or update tests when the repo has a test pattern.
- Do not introduce a new architecture style if the repo does not already support it.

## Refactor candidates

Prefer refactoring only when one of these is true:

- duplicate code has real repeated call sites
- a component/function is too large and has clear separable responsibilities
- a type or mapper is repeated and causing risk
- error/loading handling is inconsistent with existing repo pattern
- a dependency direction is clearly wrong

## Output

```text
Refactor goal:
Behavior preserved:
Files changed:
Why safe:
Validation:
Remaining risk:
```
