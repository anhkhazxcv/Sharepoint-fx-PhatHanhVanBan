---
name: spfx-feature-implementer
description: Implement SPFx TypeScript/React code by following existing repo patterns and avoiding invented domain/data model.
---

# SPFx Feature Implementer

Use this skill after the plan is clear.

## Implementation rules

- Follow existing folder structure and code style.
- Reuse existing components, hooks, services, repositories, mappers, types, constants, and helpers.
- Keep UI logic separate from service/data access if the repo already does this.
- Keep functions small and typed.
- Do not add new SharePoint fields/list names/statuses/roles unless provided.
- Do not add dependencies without approval.
- Do not silently swallow errors.
- Do not hard-code tenant/site/list URLs unless the repo already requires it and it is configurable.

## SPFx-specific guardrails

- Check whether the project uses old gulp toolchain or newer Heft-based scripts.
- Use SPFx context according to existing code.
- Do not request new Graph/API scopes unless the user asks.
- Respect the React and Fluent UI versions already installed.
- Avoid direct DOM manipulation.

## Done criteria

- Code compiles or the compile blocker is documented.
- No unrelated files changed.
- New code matches nearby patterns.
- Edge states are handled where relevant: loading, empty, error, forbidden.
- Assumptions are documented.
