#!/bin/bash
# Audit Script for ArtistYar-Website
# Usage: ./scripts/run-audit.sh <URL>

if [ -z "$1" ]; then
  echo "Error: Please provide a URL argument."
  exit 1
fi

TARGET_URL=$1
echo "Starting audit for: $TARGET_URL"

# Ensure dependencies are available
if ! command -v npx &> /dev/null; then
    echo "npx could not be found. Please install Node.js and npm."
    exit 1
fi

# Run Lighthouse CI (JSON output)
echo "Running Lighthouse..."
npx lighthouse "$TARGET_URL" \
  --output=json \
  --output-path=./reports/lighthouse-report.json \
  --chrome-flags="--headless" \
  --quiet

# Run Axe-core CLI (JSON output)
echo "Running Axe-core..."
npx @axe-core/cli "$TARGET_URL" \
  --save reports/axe-report.json \
  --json > reports/axe-output.json

echo "Audit complete. Reports saved in ./reports/"