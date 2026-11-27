# 1. Engineering foundations before the 2027 pricing change

Date: 2026-11-27

Status: Accepted

## Context

For 2027, Quantex replaces its single global daily rate with resource-based estimation (roles from a rate card,
assigned to each line). That rewrites the pricing engine, the estimate data model and most of the estimator screen.

At the time of the decision the repo had no committed tests, linter, formatter, CI or staging environment. Every
deploy went straight to the live database. The pricing formula was repeated in about 20 places in `src/App.jsx`, and
`.gitignore` had lost its comment markers, which silently ignored new files in `public/`.

## Decision

Put the safety net in place first, without changing any app behaviour:

- A test suite on Node's built-in test runner, calling the Worker's real request handler against an in-memory D1
  stand-in on `node:sqlite`. No test framework dependency.
- Expected totals for the current pricing formula, recorded as fixtures, to verify the formula when it's moved into
  `shared/pricing.js`.
- ESLint 9 and Prettier, with the codebase formatted once in a single commit. Problems already in the code are
  warnings, so CI fails only on new errors.
- GitHub Actions running lint, format check, tests, build and `npm audit` on every push, and Dependabot.
- A staging Worker and D1 database, used before every live deploy and migration.

## Consequences

- Each 2027 change can be shipped and verified on its own, and a regression in sign-in, roles or the SPOE workflow is
  caught before merge.
- The one-off formatting commit makes `git blame` noisy unless its hash is listed in `.git-blame-ignore-revs`.
- ESLint stays on version 9 until `eslint-plugin-react` supports version 10.
- Staging needs its own test accounts, and must never be loaded with live data (it holds names and emails).
- The legacy pricing fixtures only start running once RB-04 extracts the formula; until then they are skipped tests.
