# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SharePoint Framework (SPFx 1.20.0) web part named **phvb** — implements "Phát hành văn bản" (PHVB, document issuance/publishing) for a SharePoint site. Single web part: `PhvbMagWebPart` under `src/webparts/phvbMag/`.

Stack: React 17 + `@fluentui/react` v8 (Fluent UI v8, not v9) + TypeScript 4.7.4 + gulp-based SPFx build toolchain (not Heft). `react-router-dom` v6 for in-webpart routing, `react-toastify` for toasts. No PnPjs — SharePoint REST access goes through a hand-written HTTP layer.

## Commands

- `npm run serve` — `gulp serve`, local dev server with hot reload (workbench).
- `npm run build` — `gulp bundle` (dev bundle).
- `npm run build:uat` — swaps env config then `gulp bundle --ship && gulp package-solution --ship` for UAT.
- `npm run build:prod` — same as above targeting prod env.
- `npm run clean` — `gulp clean`.
- `npm test` — `gulp test` (no actual test files exist in `src/` yet; there is no jest config — treat this as a no-op until tests are added).
- `npm run export:data-model` — `node scripts/generate-data-model-xlsx.mjs`, regenerates `docs/PHVB_DataModel_Lists_Fields.xlsx` from the list/field constants.
- Lint: no separate `lint` script; ESLint config is `.eslintrc.js` extending `@microsoft/eslint-config-spfx/lib/profiles/react` + `@rushstack/eslint-config`. Run via the SPFx build (`gulp bundle` runs lint) or `npx eslint src --ext .ts,.tsx`.

## Architecture

All code lives under `src/webparts/phvbMag/`, layered as:

- `services/` — one service per feature/flow (24 files), e.g. `PhvbMagWorkflowAction.service.ts`, `PhvbMagBanHanh.service.ts`, `PhvbMagIssuancePublish.service.ts`, `PhvbMagSendMail.service.ts`. Each service owns the business logic for one slice of the workflow and calls into `repositories/`/`infrastructure/`.
- `repositories/PhvbMag.repository.ts` — data-access layer over SharePoint lists/libraries.
- `infrastructure/` — low-level SharePoint REST wrappers (`SharePointHttp.utils.ts`, `SharePointFile.utils.ts`, `SharePointSite.utils.ts`). This is the only place raw REST calls should be made; there is no PnPjs dependency.
- `components/` — React components/dialogs/views (e.g. `PhvbMagDetail.tsx`, `PhvbMagWorkflowActionDialog.tsx`, `PhvbMagLibraryView.tsx`, `PhvbMagHomeView.tsx`).
- `hooks/` — data-fetching/state hooks used by components.
- `context/` — React context providers shared across the web part.
- `config/PhvbMag.configuration.ts` — single source of truth for SharePoint list/library titles, status/role/mail-type constants (`REQUEST_STATUS`, `PHVB_ROLES`, `SEND_MAIL_TYPE`), and tunable limits (batch sizes, cache TTLs). Never hardcode a list name, status string, or role key that already has a constant here.
- `models/` — shared TypeScript types/interfaces.
- `utils/` — role/permission helpers (`PhvbMagRole.utils.ts`, `PhvbMagWorkflowPermission.utils.ts`) and other shared logic.
- `loc/` — localized strings.

### Business domain (PHVB workflow)

The core domain is a document-issuance approval workflow with statuses defined in `REQUEST_STATUS` (`config/PhvbMag.configuration.ts`): Bản nháp → Đang góp ý → Đang thẩm định → Đang phê duyệt → Chờ cấp số → Đã cấp số → Chờ ban hành → Ban hành, with exception paths (Từ chối, Thu hồi, Chờ admin/super admin thu hồi). Full narrative is in `docs/PhvbMag_Luong_TrangThai.md`.

Two request types exist — **Viết mới** (new document) vs **Điều chỉnh** (amendment) — with different attachment/publish/folder-reuse rules; do not assume they share a code path without checking the relevant service.

Roles are `PHVB_ROLES` (`dc`, `admin`, `superAdmin`) plus stage-specific participant roles (góp ý, thẩm định, phê duyệt); permission gates live in `PhvbMagWorkflowPermission.utils.ts` and `PhvbMagRole.utils.ts` — client-side checks are UX only, not a security boundary.

### UI conventions

- Icons: only via `react-icons/fa`, wrapped through `PhvbMagIcons.tsx`. Never import `@fluentui/react-icons` or use emoji/text glyphs as icons.
- Styling: SCSS modules per component (`*.module.scss`); reuse existing `$primary-*`/`$bg-*`/`$text-*`/border/radius/shadow tokens already defined in the web part stylesheets rather than introducing new hex colors. Design language is PHVB bronze/cream — do not fall back to default Fluent blue theme.
- Keep enterprise density (tables/forms), not marketing-style spacious layouts — this renders inside a SharePoint web part frame, not a full page.

### Reference docs

- `docs/PhvbMag_Luong_TrangThai.md` — status/workflow flow narrative (Vietnamese).
- `docs/PHVB_DataModel_Lists_Fields.xlsx` — SharePoint list/field data model (generated via `npm run export:data-model`).
- `docs/test-cases/PhvbMag_PhatHanhVanBan_TestCases.csv` — manual QA test case matrix (no automated tests exist; this is the current source of truth for expected behavior per role/flow).

### Non-negotiables

- Do not invent SharePoint list/library names, fields, statuses, roles, or mail types — use only what's defined in `config/PhvbMag.configuration.ts` or explicitly provided.
- Do not add new dependencies (especially PnPjs, `@fluentui/react-icons`) without approval.
- There is no CI/CD pipeline (`.github/workflows` etc. don't exist) and no automated tests — verify changes by running `npm run serve` and manually exercising the affected flow/role, and cross-checking against `docs/test-cases/PhvbMag_PhatHanhVanBan_TestCases.csv`.
