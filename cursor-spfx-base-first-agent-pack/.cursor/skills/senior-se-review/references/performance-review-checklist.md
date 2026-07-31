# Performance Review Checklist (SPFx / PHVB)

Focus on **measurable** issues: API calls per user action, rows fetched, re-renders.

## SharePoint REST / repository

- [ ] OData queries use `$select` for needed fields only
- [ ] `$filter` applied server-side where possible (not fetch-all-then-filter)
- [ ] `$top` / pagination appropriate for UI (table page size vs default 500)
- [ ] No N+1: loop calling `getItem` / `getFileByServerRelativeUrl` per row without batching
- [ ] Chunk/batch patterns reused from `PhvbMagDocumentLibrary.service.ts` or repository when loading many IDs
- [ ] `Promise.all` fan-out bounded (chunk size) for large participant or attachment lists
- [ ] Repeated identical requests on same mount — consider dedup or shared hook state

## Hooks and React

- [ ] Data fetch in `useEffect` has correct dependency array; no fetch storm on unrelated state changes
- [ ] Heavy derived data uses `useMemo`; stable callbacks use `useCallback` when passed to memoized children
- [ ] Inline object/array literals not passed as props to large subtrees on every render
- [ ] List/table views: client-side sort/filter on full dataset — flag if dataset can grow large
- [ ] Loading states prevent duplicate concurrent requests for same resource

## Workflow and publish hot paths

- [ ] Ban hành / publish: count sequential service calls; flag unnecessary awaits in series
- [ ] Short URL + mail + list update: failures partial — acceptable retry/cleanup documented?
- [ ] Attachment upload: parallel uploads vs memory; large file count handled

## UI / bundle (secondary)

- [ ] New heavy dependencies not added without approval
- [ ] Large icon imports — prefer named exports from existing `PhvbMagIcons.tsx`
- [ ] SCSS growth in single module — note if diff adds significant selectors (maintainability, not runtime)

## Evidence to cite in review

For each finding, state:

- **Trigger:** user action (open tab, save, approve, ban hành)
- **Hot path:** file + function + approximate call count or rows
- **Risk:** low / medium / high at expected list volume
- **Fix:** concrete pattern already used elsewhere in repo
