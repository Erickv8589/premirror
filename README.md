# Premirror Monorepo

Premirror is a library project for building Word-class page layout editors on
the web. This repository is a Bun workspace monorepo containing reusable
packages plus a reference demo app.

## Workspace Layout

- `packages/core` - shared public types and configuration contracts.
- `packages/composer` - pagination and composition engine.
- `packages/prosemirror-adapter` - ProseMirror bridge and mapping contracts.
- `packages/react` - React integration components and hooks.
- `apps/demo` - reference application demonstrating library behavior.

## Document Map

- `docs/design-proposal.md` - architecture and long-term roadmap.
- `docs/milestone-1-implementation-plan.md` - execution plan through M1.
- `docs/proposed-api-design.md` - proposed package APIs and contracts.
- `docs/design-review.md` - review notes and follow-up decisions.

## Development

```sh
bun install
bun dev
```

## Build and Checks

```sh
bun run build
bun run typecheck
bun run lint
```
