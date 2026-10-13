#!/usr/bin/env bash
#
# tools/verify.sh — one-command verification for the AME reporting platform.
#
# Runs, where possible:
#   1. TypeScript typecheck of server/src (via the server tsconfig)
#   2. TypeScript typecheck of server/seed + server/test (outside the tsconfig)
#   3. TypeScript typecheck of the web app
#   4. The vitest API suite (needs DATABASE_URL pointing at a test database)
#
# Prints a PASS/FAIL summary at the end. Exits 0 only if every attempted
# step passes; a step that cannot run (e.g. no DATABASE_URL) is reported
# as SKIP, not FAIL.
#
# Usage:
#   ./tools/verify.sh
#   DATABASE_URL=postgresql://amereports:amereports@localhost:5432/amereports_test ./tools/verify.sh

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
SKIP=0
FAILED_STEPS=()

step() { # name, then command...
  local name="$1"; shift
  echo "==> $name"
  if "$@" > /tmp/verify-step.log 2>&1; then
    echo "    PASS"
    PASS=$((PASS + 1))
  else
    echo "    FAIL (see /tmp/verify-step.log)"
    tail -20 /tmp/verify-step.log | sed 's/^/    /'
    FAIL=$((FAIL + 1))
    FAILED_STEPS+=("$name")
  fi
}

skip() { # name, reason
  echo "==> $1"
  echo "    SKIP: $2"
  SKIP=$((SKIP + 1))
}

echo "AME reporting platform verification — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "repo: $ROOT"
echo

# 1. Server typecheck (src/** via tsconfig)
step "server typecheck (src)" npm run typecheck --workspace=server

# 2. Seed + tests typecheck (outside the server tsconfig include)
step "server typecheck (seed + test)" bash -c "cd '$ROOT/server' && npx tsc --noEmit \
  --strict --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames \
  --module commonjs --target es2022 --moduleResolution node --lib es2022 \
  seed/seed.ts test/test-env.ts test/setup.ts test/helpers.ts \
  test/auth-scoping.test.ts test/rollups.test.ts \
  test/license.test.ts test/annual-setup.test.ts"

# 3. Web typecheck
step "web typecheck" bash -c "cd '$ROOT/web' && npx tsc --noEmit"

# 4. API tests (needs a database)
if [ -z "${DATABASE_URL:-}" ]; then
  skip "server tests (vitest)" "DATABASE_URL is not set — point it at an empty test database, e.g. postgresql://amereports:amereports@localhost:5432/amereports_test"
else
  step "server tests (vitest)" npm run test:server
fi

echo
echo "================ SUMMARY ================"
echo "PASS: $PASS   FAIL: $FAIL   SKIP: $SKIP"
if [ "$FAIL" -gt 0 ]; then
  echo "Failed steps:"
  for s in "${FAILED_STEPS[@]}"; do echo "  - $s"; done
  exit 1
fi
echo "All attempted checks passed."
