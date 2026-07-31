# Review Checklist

Correctness:
- Does behavior match the requirement only?
- Are edge cases handled?
- Are async errors handled?

Architecture:
- Does it follow existing patterns?
- Does it avoid speculative layers?
- Are dependencies flowing in the same direction as the repo?

SPFx:
- Compatible with current SPFx toolchain?
- Uses SPFx context safely?
- No hard-coded tenant/site/list assumptions?

Security:
- No secrets.
- No permission bypass.
- No unnecessary Graph/API scope changes.

Maintainability:
- Typed.
- Small functions/components.
- No unrelated refactor.
- Validated.
- Icons use `react-icons/fa` via the web part icon wrapper; no new `@fluentui/react-icons`.
- UI matches PHVB enterprise design system (tokens, density, states); see `spfx-enterprise-ui` skill.

Business and performance (workflow, roles, API efficiency):
- For deep review, use `senior-se-review` skill and its checklists.
