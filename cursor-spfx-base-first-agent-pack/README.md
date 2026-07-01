# Cursor SPFx Base-First Agent Pack

This pack is intentionally lightweight. It does not define business rules or a SharePoint data model.
It gives Cursor Agent a senior engineering discipline for an existing SPFx codebase:

- inspect the existing base before coding
- preserve current architecture and naming unless asked to change it
- do not invent business workflow, lists, fields, APIs, permissions, or data contracts
- implement small, typed, testable changes
- validate using the scripts already present in package.json
- explain assumptions and missing information instead of guessing

## Install

Copy these files into the root of your SPFx repository:

```bash
cp -R .cursor AGENTS.md PROJECT_CONTEXT.md .
```

Then open the repo in Cursor.

## Recommended first prompt

```text
Use the base-first rules. Read AGENTS.md, PROJECT_CONTEXT.md, package.json, config/, src/.
Build a short architecture map of the existing codebase first.
Do not modify code yet.
```

## Recommended implementation prompt

```text
Use /implementation-planner and /spfx-feature-implementer.
Implement this requirement strictly following existing patterns:
<your requirement>
Do not create new domain models, SharePoint fields, lists, permissions, or APIs unless I explicitly provide them.
Show the plan before editing.
```

## What you should customize

Fill `PROJECT_CONTEXT.md` with your actual project notes. Keep it factual only.
Do not put speculative data models or future workflows there.
