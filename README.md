# Quantex Estimator

An internal estimating tool for FirstBaseIT. Estimators build project estimates from a Service Menu, an API Service
Menu, admin and project constants and Time & Materials work. Estimates go through an SPOE check before a Manager
approves them. Exports: CSV, clipboard summary and a Word mandate.

- **Front end:** React 18, Vite, Tailwind CSS (`src/`)
- **API:** a Cloudflare Worker (`worker/index.js`) that serves `/api/*` and the built front end
- **Database:** Cloudflare D1 (`schema.sql`, `migrations/`)
- **Shared logic:** `shared/` is used by both the front end and the Worker, so the two can't disagree

## Roles

| Role      | Can do                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------- |
| Estimator | Create and edit estimates, request an SPOE check                                                   |
| Manager   | Everything an Estimator can, plus approve estimates and change the default daily rate              |
| Admin     | Manage users and their own password only. No access to estimates. Use a second account to estimate |

Users sign in with a unique username. One email can hold one account per role.

## Prerequisites

- Node.js 22.5 or later (`.nvmrc` pins 22). The test suite uses Node's built-in SQLite.
- A Cloudflare account with access to the `quantex-estimator` Worker, for deploys only.
  Wrangler (the Cloudflare CLI) runs through `npx`, so there's nothing else to install.

## Set up

```bash
git clone https://github.com/reverseabc/Quantex-Estimator.git
cd Quantex-Estimator
npm ci
```

## Run locally

Front end only (no API, so you can't sign in):

```bash
npm run dev
```

Full app with the API and a local database:

```bash
npx wrangler d1 execute quantex-db --local --file=schema.sql   # first time only
node scripts/create-admin.mjs "Test Admin" admin@example.test  # writes seed-admin.sql
npx wrangler d1 execute quantex-db --local --file=seed-admin.sql && rm seed-admin.sql
npm run build && npx wrangler dev
```

Then open http://localhost:8787. The local database lives in `.wrangler/` (git-ignored).

## Test and check

| Command                | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `npm test`             | Runs the test suite (Node's built-in test runner)            |
| `npm run lint`         | ESLint. Existing problems are warnings; new errors fail      |
| `npm run format`       | Formats everything with Prettier                             |
| `npm run format:check` | Fails if anything isn't formatted                            |
| `npm run check`        | Lint, format check, tests and build: run before every commit |

The tests call the Worker's real request handler against an in-memory database (`test/helpers/fakeD1.js`) built from
`schema.sql`. All test data is synthetic.

GitHub Actions runs the same checks on every push and pull request (`.github/workflows/ci.yml`). Dependabot opens weekly
update pull requests.

## Deploy

Always deploy to staging first.

```bash
npm run deploy:staging      # https://quantex-estimator-staging.<account>.workers.dev
npm run deploy:production   # https://quantex-estimator.<account>.workers.dev
```

### Database migrations

Migrations are versioned SQL files in `migrations/`. Never edit one that has already been applied.

```bash
# 1. Staging first
npx wrangler d1 execute quantex-db-staging --remote --file=./migrations/NNNN_name.sql

# 2. Live: back up, then migrate. Keep backups outside the repo folder.
npx wrangler d1 export quantex-db --remote --output=../quantex-backups/backup-before-NNNN.sql
npx wrangler d1 execute quantex-db --remote --file=./migrations/NNNN_name.sql
```

`schema.sql` is the fresh-install shape: the result of applying every migration.

## Configuration

There are no secrets or environment variables. Everything is in `wrangler.toml`:

| Binding              | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `DB`                 | D1 database (`quantex-db` live, `quantex-db-staging` staging) |
| `LOGIN_IP_LIMITER`   | Sign-in rate limit per IP: 10 per minute                      |
| `LOGIN_USER_LIMITER` | Sign-in rate limit per username: 5 per minute                 |
| `ASSETS`             | The built front end in `dist/`                                |

The default daily rate is stored in the database (`settings` table) and changed by a Manager in Settings.

## Project records

- Design decisions: `docs/adr/`
- Changes by release: `CHANGELOG.md`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
