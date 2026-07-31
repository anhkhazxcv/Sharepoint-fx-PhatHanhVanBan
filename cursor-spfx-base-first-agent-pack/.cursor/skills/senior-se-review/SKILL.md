---
name: senior-se-review
description: Senior software engineer review of SPFx changes for PHVB business-rule correctness and runtime performance. Use when reviewing plans, diffs, or PRs for workflow/status/role logic, Viết mới vs Điều chỉnh behavior, SharePoint API efficiency, re-renders, pagination, or when the user asks for senior SE review, business review, or performance review.
---

# Senior SE Review (Business + Performance)

Use this skill for a **second-layer review** after architecture/correctness. Complements `senior-review`; does not replace it.

## When to use

- Reviewing a **plan** or **implementation** before merge
- User asks for senior SE, business, workflow, or performance review
- Changes touch workflow actions, status transitions, roles, ban hành, library views, or data-loading hooks

## When NOT to use

- Pure typo or single-line style fix with no business/perf impact → `senior-review` is enough
- Active debugging of a failing build or runtime error → `bugfix-debug`
- UI-only visual consistency → `spfx-enterprise-ui`

## Review workflow

1. **Scope** — List files/flows in the diff (workflow, services, hooks, list queries).
2. **Business** — Run [business-review-checklist.md](references/business-review-checklist.md) against code and docs.
3. **Performance** — Run [performance-review-checklist.md](references/performance-review-checklist.md).
4. **Verdict** — Blockers / majors / minors with file:line and suggested fix.

## Business review principles

- **Do not invent rules** — Compare against existing code and documented facts only.
- **Primary sources (PHVB):**
  - [`docs/PhvbMag_Luong_TrangThai.md`](../../../../docs/PhvbMag_Luong_TrangThai.md) — status flow overview
  - [`PhvbMag.configuration.ts`](../../../../src/webparts/phvbMag/config/PhvbMag.configuration.ts) — `REQUEST_STATUS`, roles, mail types
  - Workflow services (`PhvbMagWorkflowAction.service.ts`, `PhvbMagBanHanh.service.ts`, `PhvbMagIssuancePublish.service.ts`)
  - Role/permission utils (`PhvbMagRole.utils.ts`, `PhvbMagWorkflowPermission.utils.ts`)
- **Distinguish status vs history** — Actions like 「Yêu cầu chỉnh sửa」 may log history without changing `StatusApproved`; flag mismatches between UI labels, docs, and `updateReleaseStatus` calls.
- **Role gates** — Verify who can act at each stage (góp ý, thẩm định, phê duyệt, DC, Admin, Super Admin) matches existing permission helpers.
- **Request types** — Viết mới vs Điều chỉnh: attachment rules, publish path, folder handling must match existing services.
- **Flag gaps** — If business intent is unclear, list as **Missing decision** (do not guess).

## Performance review principles

- **SharePoint API:** Prefer `$select`, `$filter`, `$top`, pagination; avoid loading 500+ items when UI shows a page.
- **Chatter:** Flag N+1 loops (per-item `getItem` in `for`/`map`); prefer batch/chunk patterns already in `PhvbMagDocumentLibrary.service.ts` and repository layer.
- **Parallelism:** `Promise.all` is good for independent calls; flag unbounded parallel fan-out on large arrays.
- **React:** Unnecessary re-renders from inline objects/functions in props; missing deps in `useEffect`; fetching on every mount without cache/dedup.
- **Client filtering:** Loading full lists then filtering in browser — acceptable only if repo already does this intentionally at current scale; otherwise flag.
- **Evidence:** Cite the hot path (hook, service method, OData URL) and estimated impact (calls per user action, rows fetched).

## Severity

- **Blocker** — Wrong status transition, permission bypass, data loss, or perf pattern that will fail at production list size
- **Major** — Business edge case missed, redundant API storm, clear re-render/fetch waste
- **Minor** — Optimization opportunity, doc drift, naming
- **Note** — Context or follow-up for BA/ops

## Output format

```text
Verdict: approve / approve with comments / request changes

Business findings
Blockers
- file:line - issue - rule/source - suggested fix
Major
- ...
Minor
- ...
Missing decisions
- ...

Performance findings
Blockers
- file:line - issue - hot path - suggested fix
Major
- ...
Minor
- ...

Good parts
- ...

Validation gaps
- tests or manual scenarios still needed
```

## Boundaries

| Topic | Skill |
|-------|--------|
| Architecture fit, types, security basics | `senior-review` |
| Business + performance deep dive | this skill |
| UI design system | `spfx-enterprise-ui` |
| Pre-implementation plan | `implementation-planner` |

## Additional resources

- [business-review-checklist.md](references/business-review-checklist.md)
- [performance-review-checklist.md](references/performance-review-checklist.md)
