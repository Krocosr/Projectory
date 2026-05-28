---
name: clean-ci-cd
description: "Clean CI/CD pipeline for Deadliner — GitHub Actions CI workflow that builds the Next.js app on push/PR to master"
---

# Clean CI/CD Pipeline

## When to Use

Use this skill when setting up, modifying, or troubleshooting CI/CD for Deadliner. Also use when reviewing CI/CD-related PRs or adding new CI steps.

## Pipeline Overview

- **Provider**: GitHub Actions
- **Trigger**: Push or PR to `master`
- **Job**: `build` — runs on `ubuntu-latest`
- **Node**: 20 (with npm cache)

## Workflow File

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
```

## Verification

The pipeline runs `npm run build` as its sole verification step. Deadliner has no test framework or lint scripts, so build success is the quality gate.

## Adding Steps

To add a new step (e.g., lint, type-check, deploy):

1. Add the corresponding npm script to `package.json`
2. Add a new `- run:` line in `.github/workflows/ci.yml` after the build step
3. Update this skill to reflect the new pipeline

## Repo Rules

- Secrets (`.env`, `.env.local`) are gitignored — never commit them
- `data/projects.json` is gitignored (user data, regenerated on dev)
- Version bumps happen before commits via `npm pkg set version`

## Deployment

Not configured. When a deployment target is chosen (Vercel, Railway, etc.), add a deploy job that runs after successful build.
