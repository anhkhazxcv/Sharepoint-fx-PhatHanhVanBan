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
- [ ] History records use `EXECUTION_HISTORY_STATUS` appropriately
- [ ] No new statuses/roles/lists without user approval

## Plan review (when reviewing a plan, not only code)

- [ ] Plan states which workflow stages and roles are affected
- [ ] Plan identifies Viết mới vs Điều chỉnh impact
- [ ] Plan lists manual test scenarios per role/stage touched
- [ ] Assumptions and missing BA decisions are explicit
