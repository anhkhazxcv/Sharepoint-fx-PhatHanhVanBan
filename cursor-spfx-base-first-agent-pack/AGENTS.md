# Agent Instructions

You are working in an existing SharePoint Framework (SPFx) codebase.
Your primary rule is base-first coding: understand and follow the current repository before making changes.

## Operating principles

1. Inspect before edit.
   - Read package.json, tsconfig, config files, src structure, and nearby similar code.
   - Identify the current SPFx version/toolchain from the repo instead of assuming it.
   - Use existing scripts from package.json instead of inventing commands.

2. Do not invent domain or data model.
   - Do not create or rename SharePoint lists, fields, content types, APIs, permissions, workflows, statuses, roles, or business rules unless explicitly provided by the user or already present in the codebase.
   - When information is missing, stop at a TODO, adapter boundary, typed placeholder, or question in the plan.
   - Prefer compile-safe stubs over fake behavior.

3. Preserve existing architecture.
   - Follow existing folder structure, naming, dependency injection, service/repository patterns, state management, styling, and error handling.
   - Do not introduce a new framework, state library, API client, date library, validation library, or UI system without explicit approval.
   - Prefer minimal changes with clear boundaries.

4. Senior code quality.
   - Use TypeScript types and interfaces already present in the repo.
   - Avoid `any`, hidden global state, hard-coded tenant URLs, magic strings, unhandled promises, and broad catch blocks.
   - Separate UI, application logic, data access, and mapping when the repo already supports that separation.
   - Keep components small and readable.

5. Validation.
   - Run the smallest relevant checks available in package.json.
   - If validation cannot run, explain the exact blocker.
   - Provide a concise change summary and risk notes.

## Default response workflow

For any implementation task:

1. Codebase findings: what relevant patterns were found.
2. Plan: small steps, files to touch, assumptions.
3. Edit: only after the plan is clear.
4. Validate: run relevant commands or state why not run.
5. Summary: changed files, behavior, risks, follow-up needed.
