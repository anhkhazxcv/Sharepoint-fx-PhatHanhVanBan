---
name: codebase-cartographer
description: Map the existing SPFx codebase before implementation. Use this before coding, refactoring, or reviewing unfamiliar areas.
---

# Codebase Cartographer

Use this skill to understand the current repository without editing code.

## Goals

- identify SPFx version and toolchain from package.json and config
- identify folder structure and architectural layers that actually exist
- find similar features/components/services/tests
- identify naming conventions and error/loading patterns
- identify existing data access patterns without inventing data model

## Process

1. Read package.json, tsconfig, config/, and src/ top-level folders.
2. Search for files similar to the requested feature.
3. Inspect nearby components, services, repositories, hooks, models, tests, and styles.
4. Produce an architecture map.
5. List missing information that must come from the user.

## Output format

```text
Codebase map
- Toolchain:
- Main folders:
- Similar existing files:
- Current UI pattern:
- Current service/data pattern:
- Current typing pattern:
- Current validation/test pattern:

Constraints
- Do not change:
- Missing user decisions:

Recommended implementation path
- Step 1:
- Step 2:
- Step 3:
```

## Optional script

Run `node .cursor/skills/codebase-cartographer/scripts/inspect-project.mjs` from repo root for a quick static summary.
