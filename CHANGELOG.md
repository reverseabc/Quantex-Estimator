# Changelog

All notable changes to Quantex Estimator are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Automated tests for sign-in, roles, the SPOE workflow and user management (`npm test`).
- Linting and formatting (`npm run lint`, `npm run format`) and a combined `npm run check`.
- Continuous integration on GitHub Actions, and weekly Dependabot updates.
- A staging environment (`npm run deploy:staging`).

### Fixed

- `.gitignore` no longer ignores new files in `public/`, and now ignores database exports.

### Changed

- README rewritten to match the current app (Cloudflare Worker and D1, sign-in, roles).

## [1.0.0] - 2026-11-27

Live version at the time this changelog was started: Worker `7b3d7edc`, `main` at `7242df3`. Includes in-app user
accounts with Admin, Manager and Estimator roles, username sign-in, login rate limiting and the SPOE approval workflow.
