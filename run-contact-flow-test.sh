#!/bin/bash
# Backup original .env
cp .env .env.backup

# Copy test environment for testing
cp .env.test .env

# Run tests
VITE_ENV=test npx playwright test tests/system/contact-flow.spec.ts --reporter=list --project=chromium

# Restore original .env
mv .env.backup .env
