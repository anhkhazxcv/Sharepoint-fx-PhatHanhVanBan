# Business Review Checklist (PHVB)

Verify against **existing code and docs** — do not invent rules.

## Workflow and status

- [ ] Status transitions match `REQUEST_STATUS` in `PhvbMag.configuration.ts`
- [ ] Happy path aligns with `docs/PhvbMag_Luong_TrangThai.md` (Bản nháp → … → Ban hành)
- [ ] Exception paths: Từ chối ends flow; Trả về Admin moves to Đã cấp số
- [ ] 「Yêu cầu chỉnh sửa」 treated correctly: history-only vs `StatusApproved` update (check `PhvbMagWorkflowAction.service.ts`)
- [ ] Skipping góp ý when no participants is handled consistently
- [ ] Terminal states (Ban hành, Từ chối) cannot re-enter workflow without explicit support in code

## Roles and permissions

- [ ] Action buttons visibility matches `PhvbMagWorkflowPermission.utils.ts` / role helpers
- [ ] DC-only actions (cấp số) not exposed to wrong roles
- [ ] Admin / Super Admin ban hành steps respect `PhvbMagRole.utils.ts`
- [ ] Client-side gates are UX only — server/list permissions still assumed; no false sense of security documented as enforcement

## Request types (Viết mới vs Điều chỉnh)

- [ ] Correct create/save path for each type
- [ ] Attachment requirements match product rules in existing modals/validation
- [ ] Publish/ban hành uses correct service (`PhvbMagIssuancePublish.service.ts`, `PhvbMagBanHanh.service.ts`)
- [ ] Điều chỉnh: old document archival / folder reuse matches existing publish utils

## Mail and notifications

- [ ] Mail type constants from `SEND_MAIL_TYPE` used consistently
- [ ] No email sent on paths user asked to skip (if scope says skip mail)
- [ ] Template tokens (e.g. link placeholders) replaced before send

## Data model

- [ ] List/field names match configuration constants — no invented internal names
- [ ] History records use `TRANG_THAI_THUC_HIEN` appropriately
- [ ] No new statuses/roles/lists without user approval

## Plan review (when reviewing a plan, not only code)

- [ ] Plan states which workflow stages and roles are affected
- [ ] Plan identifies Viết mới vs Điều chỉnh impact
- [ ] Plan lists manual test scenarios per role/stage touched
- [ ] Assumptions and missing BA decisions are explicit

## Dead code / tech debt (always)

Run on every review, not only when a field or API was renamed.

- [ ] Unused imports, helpers, CSS classes, payload keys, sort keys, or types in the diff have no remaining callers — flag removal
- [ ] If the diff renames/removes a symbol: grep the old name (`oldField`, old endpoint) in `src/` (and manifest/docs if present) is 0; no `oldField = newField` alias when the old source is gone
- [ ] Create/update payloads and `$select` lists do not send or request removed fields
- [ ] Model/interfaces do not keep dead properties
- [ ] Manifest/docs match code when those files exist in the repo
- [ ] Similar symbols outside the diff are not pulled into scope; out-of-scope neighbors are stated if relevant
- [ ] Unowned TODOs, timezone/format mismatches, and client-filter debt in the touched flow are flagged
