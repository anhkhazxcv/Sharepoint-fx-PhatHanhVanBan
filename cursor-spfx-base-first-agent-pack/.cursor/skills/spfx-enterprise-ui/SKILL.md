---
name: spfx-enterprise-ui
description: Guides SPFx/React UI to match the existing PHVB enterprise design system (tokens in PhvbMag.module.scss, Fluent components, react-icons wrappers). Use when designing or restyling layouts, dialogs, tables, forms, toolbars, sidebars, empty/loading states, or when the user mentions enterprise UI, design system, or làm đẹp giao diện web part.
---

# SPFx Enterprise UI (PHVB)

Use this skill when the task is primarily visual: layout, SCSS, dialogs, tables, forms, toolbars, or empty/loading states.

## When to use

- Layout, spacing, hierarchy, or restyling of existing screens
- New UI surfaces that must match PHVB (sidebar, table, modal, detail page, toolbar)
- User asks for enterprise UI, design system consistency, or "làm đẹp" the web part

## When NOT to use

- Pure logic bugs, data mapping, or SharePoint API issues
- Domain or data model changes
- Global rebrand unless the user explicitly requests it

## Non-negotiables

- **Source of truth:** SCSS variables at the top of `src/webparts/phvbMag/components/PhvbMag.module.scss` (`$primary-color`, `$primary-hover`, `$primary-light`, `$bg-*`, `$text-*`, `$border-color`, shadows). If tokens are later extracted to separate files, follow those files instead.
- **No marketing surfaces:** Do not apply landing-page aesthetics (full-bleed hero, expressive display fonts, decorative gradients, floating promo badges) inside the web part.
- **No new palette:** Do not invent colors or switch to default Fluent blue (`#0078D4`) unless the user asks for a rebrand.
- **Icons:** Only via the web part icon wrapper (for example `PhvbMagIcons.tsx`) and `react-icons/fa`. See rule `30-spfx-typescript-react.mdc` and `spfx-feature-implementer` — do not duplicate icon policy here.
- **Fluent components:** Prefer `@fluentui/react` patterns already used in the repo (dialogs, tooltips, pickers).

## Workflow

1. **Inspect** — Find a similar screen and read nearby SCSS variables and class names.
2. **Design findings** — Emit the output format below before editing.
3. **Implement** — Minimal visual change; reuse tokens and patterns.
4. **Checklist** — Run [enterprise-ui-checklist.md](references/enterprise-ui-checklist.md).

## Output format

```text
Design findings
- Similar component/pattern:
- Tokens/variables to reuse:
- States needed (loading/empty/error/forbidden):
- A11y notes:

Plan (UI only)
1.
2.

Files
- path: reason
```

## Boundaries with other skills

- Architecture, services, data → `spfx-feature-implementer` / `implementation-planner`
- Post-change review → `senior-review` (include UI consistency in review)

## Additional resources

- [enterprise-ui-checklist.md](references/enterprise-ui-checklist.md)
