# Wagers Monorepo

This repository is organized as a Turborepo workspace containing the backend API and future client applications.

## Structure

- `api/` – NestJS + Prisma backend (migrated from the original project)
- `client/web/` – placeholder for the upcoming web client
- `client/mobile/` – placeholder for the upcoming mobile client

## Tooling

- Managed via npm workspaces and [Turborepo](https://turbo.build/)
- Root commands fan out to the apps. Examples:
  - `npm run dev` – run development servers in parallel once clients exist
  - `npm run build` – build all workspaces
  - `npm run test` – execute test pipelines across workspaces

The API codebase retains its own README with setup instructions inside `api/`.
