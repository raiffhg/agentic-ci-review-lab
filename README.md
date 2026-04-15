# agentic-ci-review-lab

`agentic-ci-review-lab` is a small learning project for exploring how a TypeScript backend, CI pipeline, and automated review rules fit together in a production-style workflow.

## Project Purpose

This repository is designed to teach three things at once:

- how to structure a small Node.js and TypeScript backend cleanly
- how to enforce quality checks with GitHub Actions
- how to simulate automated code review with a deterministic policy before adding a full AI reviewer

The first phase keeps the system intentionally simple. Instead of jumping straight to an LLM reviewer, the repo uses standard quality gates plus one custom review policy so the baseline is easy to understand.

## Stack

- Node.js
- TypeScript
- Express
- Jest and Supertest
- GitHub Actions
- ESLint
- Prettier

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server in development mode:

   ```bash
   npm run dev
   ```

3. Build the project:

   ```bash
   npm run build
   ```

## Available Scripts

- `npm run dev` starts the TypeScript server locally.
- `npm run build` compiles the project into `dist/`.
- `npm run typecheck` runs the TypeScript compiler without emitting files.
- `npm test` runs the API test suite.
- `npm run test:ci` runs the test suite in CI mode.
- `npm run lint` runs ESLint across the repo.
- `npm run format` formats the repo with Prettier.
- `npm run format:check` verifies formatting without changing files.
- `npm run review:policy` runs the custom review rule used in CI.

## CI Pipeline Overview

The GitHub Actions workflow runs on pushes and pull requests. It is intentionally small and dependable:

1. install dependencies with `npm ci`
2. run `npm run typecheck`
3. run `npm run build`
4. run `npm run test:ci`
5. run `npm run lint`
6. run `npm run format:check`
7. run `npm run review:policy`

This mirrors how a disciplined developer would validate changes locally before opening a pull request.

## Custom Review Rule

The first review policy is simple:

- if files in `src/` change, at least one file in `tests/` should also change

This is a deterministic rule, not an AI judgment. It acts like a lightweight automated reviewer that enforces one team expectation. That makes it a good baseline for later comparison with tools like CodeRabbit.

## Current API

The API is intentionally tiny:

- `POST /applications` creates a job application record
- `GET /applications` lists all created application records

Data is stored in memory so the project stays easy to reason about during the CI and review experiments.

## Future Phase

Phase 2 is to add CodeRabbit and compare:

- deterministic review policies from this repo
- AI review feedback from CodeRabbit

That comparison should be clearer once the repo already has a stable internal baseline.
