# Enterprise UI Checklist (PHVB)

Use before finalizing UI or SCSS changes.

## Tokens and layout

- [ ] Reused `$primary-*`, `$bg-*`, `$text-*`, `$border-color`, radius, and shadow variables from the web part stylesheet
- [ ] No new hex colors unless the same file already uses that value for the same purpose
- [ ] Clear hierarchy: title → toolbar/filters → content
- [ ] One job per section; no competing headlines or promo blocks in the same viewport
- [ ] Enterprise density for tables and forms (not airy marketing spacing)

## Components and SCSS

- [ ] Matched a similar existing component pattern (table row, modal footer, sidebar item, etc.)
- [ ] Shared button/dialog/form classes work without a specific parent wrapper (no nested-only styles that disappear)
- [ ] `@fluentui/react` used consistently with nearby screens
- [ ] Icons only through the web part icon wrapper; no emoji or text glyphs as icons

## States and accessibility

- [ ] Loading state for async data
- [ ] Empty state when the list or section has no items
- [ ] Error state with a clear message when fetch or action fails
- [ ] Forbidden or disabled UI when the user lacks permission (if applicable)
- [ ] Labels on form fields; focus visible on interactive controls
- [ ] Status not conveyed by color alone (use text, icon, or label)

## Anti-patterns (reject)

- [ ] No full-bleed hero or marketing hero image inside the web part
- [ ] No floating badges, stickers, or promo overlays on content
- [ ] No default Fluent blue theme replacing PHVB bronze/cream without explicit rebrand request
- [ ] No layout that assumes a full browser marketing page; design for SharePoint web part frame
