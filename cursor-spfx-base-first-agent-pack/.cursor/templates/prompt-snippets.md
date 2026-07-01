# Prompt Snippets

## Read base first

```text
Use /codebase-cartographer.
Read AGENTS.md, PROJECT_CONTEXT.md, package.json, config/, src/.
Map the current architecture and similar patterns. Do not modify code yet.
```

## Implement feature

```text
Use /implementation-planner and /spfx-feature-implementer.
Implement this requirement strictly following existing code patterns:
<requirement>
Do not invent business workflow, SharePoint data model, API contracts, roles, or permissions.
Show the plan first, then edit.
```

## Review current changes

```text
Use /senior-review.
Review the current diff against the existing codebase architecture.
Focus on correctness, type safety, SPFx compatibility, security, and whether anything was invented.
```

## Debug issue

```text
Use /bugfix-debug.
Here is the error:
<paste error>
Find the root cause using existing code patterns and make the smallest safe fix.
```

## Safe refactor

```text
Use /safe-refactor.
Refactor this area without behavior change:
<path or description>
Keep the diff small and validate with existing package.json scripts.
```
