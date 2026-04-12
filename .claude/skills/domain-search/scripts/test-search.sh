#!/bin/bash
# Tests for search.sh
# Run: ./test-search.sh          (fast tests only, no AWS calls)
#      ./test-search.sh --live   (includes AWS API tests, slower)

set -uo pipefail

SCRIPT="$(dirname "$0")/search.sh"
PASS=0
FAIL=0
LIVE=false
[ "${1:-}" = "--live" ] && LIVE=true

assert_contains() {
  local label="$1" output="$2" expected="$3"
  if echo "$output" | grep -q "$expected"; then
    echo "  ✅ $label"
    ((PASS++))
  else
    echo "  ❌ $label — expected '$expected'"
    ((FAIL++))
  fi
}

assert_not_contains() {
  local label="$1" output="$2" unexpected="$3"
  if echo "$output" | grep -q "$unexpected"; then
    echo "  ❌ $label — found '$unexpected'"
    ((FAIL++))
  else
    echo "  ✅ $label"
    ((PASS++))
  fi
}

echo "══════════════════════════════════════"
echo "  Domain Search Script Tests"
[ "$LIVE" = true ] && echo "  (including live AWS tests)"
echo "══════════════════════════════════════"
echo ""

# --- Fast tests (no AWS calls) ---
echo "INPUT HANDLING:"

# No args shows usage
OUTPUT=$($SCRIPT 2>&1; true)
assert_contains "No args shows usage" "$OUTPUT" "Usage"

# Help flag
OUTPUT=$($SCRIPT --help 2>&1; true)
assert_contains "--help shows usage" "$OUTPUT" "Usage"

# Unknown flag errors
OUTPUT=$($SCRIPT testname --bogus 2>&1; true)
assert_contains "Unknown flag errors" "$OUTPUT" "Unknown flag"

echo ""

# --- Live AWS tests ---
if [ "$LIVE" = true ]; then

  echo "AWS API (live):"

  # Basic search with single TLD (fastest)
  OUTPUT=$($SCRIPT testsearchxyz999 --tlds click 2>&1; true)
  assert_contains "Single TLD search works" "$OUTPUT" "testsearchxyz999.click"
  assert_contains "Shows price" "$OUTPUT" "/year"

  echo ""
  echo "BUDGET FILTERING:"

  OUTPUT=$($SCRIPT testsearchxyz999 --budget 5 2>&1; true)
  assert_contains "Budget 5 shows .click" "$OUTPUT" ".click"
  assert_contains "Budget 5 shows .link" "$OUTPUT" ".link"

  echo ""
  echo "VARIANTS:"

  OUTPUT=$($SCRIPT testname --variants --tlds click 2>&1; true)
  assert_contains "Variants include my-" "$OUTPUT" "my-testname"
  assert_contains "Variants include the-" "$OUTPUT" "the-testname"
  assert_contains "Variants include -dev" "$OUTPUT" "testname-dev"

  echo ""
  echo "OUTPUT FORMAT:"

  OUTPUT=$($SCRIPT testsearchxyz999 --tlds click 2>&1; true)
  assert_contains "Shows domain search header" "$OUTPUT" "Domain Search"

else
  echo "SKIPPED: AWS API tests (run with --live to include)"
fi

echo ""
echo "══════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "══════════════════════════════════════"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
