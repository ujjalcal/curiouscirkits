#!/bin/bash
# Domain Search Script — CuriousCirkits
# Usage:
#   ./search.sh <name>                           # default 9 TLDs
#   ./search.sh <name> --budget 10               # TLDs under $10
#   ./search.sh <name> --budget 5                # TLDs under $5
#   ./search.sh <name> --tlds com,xyz,me         # specific TLDs
#   ./search.sh <name> --variants                # also search my-name, the-name, name-dev
#   ./search.sh <name> --all                     # all 365 TLDs (slow)
#
# Combine flags:
#   ./search.sh reyanmakes --budget 10 --variants

set -euo pipefail

REGION="us-east-1"
DEFAULT_TLDS="com,click,link,org,net,xyz,site,online,me"
CACHE_DIR="/tmp/domain-search-cache"
CACHE_TTL=86400  # 24 hours

# --- Parse arguments ---
NAME=""
BUDGET=""
TLDS=""
VARIANTS=false
ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --budget) BUDGET="$2"; shift 2 ;;
    --tlds) TLDS="$2"; shift 2 ;;
    --variants) VARIANTS=true; shift ;;
    --all) ALL=true; shift ;;
    --help|-h)
      echo "Usage: ./search.sh <name> [--budget N] [--tlds com,xyz] [--variants] [--all]"
      exit 0
      ;;
    -*) echo "Unknown flag: $1"; exit 1 ;;
    *) NAME="$1"; shift ;;
  esac
done

if [ -z "$NAME" ]; then
  echo "Error: provide a domain name to search"
  echo "Usage: ./search.sh <name> [--budget N] [--tlds com,xyz] [--variants] [--all]"
  exit 1
fi

# Clean the name
NAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed 's/\.[a-z]*$//' | tr -cd 'a-z0-9-')

# --- Cache TLD pricing ---
mkdir -p "$CACHE_DIR"
PRICE_CACHE="$CACHE_DIR/prices.json"

fetch_prices() {
  if [ -f "$PRICE_CACHE" ]; then
    AGE=$(( $(date +%s) - $(stat -f %m "$PRICE_CACHE" 2>/dev/null || stat -c %Y "$PRICE_CACHE" 2>/dev/null || echo 0) ))
    if [ "$AGE" -lt "$CACHE_TTL" ]; then
      return
    fi
  fi
  aws route53domains list-prices --region "$REGION" --output json > "$PRICE_CACHE" 2>/dev/null
}

get_price() {
  local tld="$1"
  python3 -c "
import json, sys
with open('$PRICE_CACHE') as f:
    data = json.load(f)
for p in data['Prices']:
    if p['Name'] == '$tld' and 'RegistrationPrice' in p:
        print(int(p['RegistrationPrice']['Price']))
        sys.exit(0)
print('-1')
" 2>/dev/null
}

# --- Determine which TLDs to search ---
fetch_prices

if [ "$ALL" = true ]; then
  # All TLDs from price list
  TLD_LIST=$(python3 -c "
import json
with open('$PRICE_CACHE') as f:
    data = json.load(f)
for p in sorted(data['Prices'], key=lambda x: x.get('RegistrationPrice', {}).get('Price', 9999)):
    if 'RegistrationPrice' in p:
        print(p['Name'])
")
elif [ -n "$BUDGET" ]; then
  # TLDs under budget
  TLD_LIST=$(python3 -c "
import json
with open('$PRICE_CACHE') as f:
    data = json.load(f)
for p in sorted(data['Prices'], key=lambda x: x.get('RegistrationPrice', {}).get('Price', 9999)):
    if 'RegistrationPrice' in p and p['RegistrationPrice']['Price'] <= $BUDGET:
        print(p['Name'])
")
elif [ -n "$TLDS" ]; then
  TLD_LIST=$(echo "$TLDS" | tr ',' '\n')
else
  TLD_LIST=$(echo "$DEFAULT_TLDS" | tr ',' '\n')
fi

# --- Build name list ---
NAMES="$NAME"
if [ "$VARIANTS" = true ]; then
  NAMES="$NAME
my-${NAME}
the-${NAME}
${NAME}-dev
${NAME}-makes
${NAME}-codes"
fi

# --- Search ---
RESULTS_FILE=$(mktemp /tmp/domain-results-XXXXXX)

search_domain() {
  local name="$1"
  local tld="$2"
  local domain="${name}.${tld}"

  local avail
  avail=$(aws route53domains check-domain-availability \
    --domain-name "$domain" --region "$REGION" --output json 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['Availability'])" 2>/dev/null \
    || echo "ERROR")

  local price
  price=$(get_price "$tld")

  local status="TAKEN"
  if [ "$avail" = "AVAILABLE" ]; then
    status="AVAILABLE"
  fi

  echo "${name}|${tld}|${status}|${price}" >> "$RESULTS_FILE"
}

# Run searches (parallel within each name, max 10 concurrent)
echo "" > "$RESULTS_FILE"

for name in $NAMES; do
  PIDS=()
  for tld in $TLD_LIST; do
    search_domain "$name" "$tld" &
    PIDS+=($!)
    # Limit concurrency to 10
    if [ ${#PIDS[@]} -ge 10 ]; then
      wait "${PIDS[0]}" 2>/dev/null || true
      PIDS=("${PIDS[@]:1}")
    fi
  done
  # Wait for remaining
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
done

# --- Display results ---
echo ""
echo "══════════════════════════════════════"
if [ -n "$BUDGET" ]; then
  echo "  Domain Search: (under \$${BUDGET}/year)"
else
  echo "  Domain Search"
fi
echo "══════════════════════════════════════"
echo ""

# Process results: group by name, sort by price
for name in $NAMES; do
  if [ "$VARIANTS" = true ]; then
    echo "  $name:"
  fi

  # .com first (if searched)
  COM_LINE=$(grep "^${name}|com|" "$RESULTS_FILE" 2>/dev/null || true)
  if [ -n "$COM_LINE" ]; then
    STATUS=$(echo "$COM_LINE" | cut -d'|' -f3)
    PRICE=$(echo "$COM_LINE" | cut -d'|' -f4)
    if [ "$STATUS" = "AVAILABLE" ]; then
      if [ -n "$BUDGET" ] && [ "$PRICE" -gt "$BUDGET" ] 2>/dev/null; then
        : # show later in over-budget section
      else
        printf "    ✅ %-30s  \$%s/year  ← recommended\n" "${name}.com" "$PRICE"
      fi
    else
      printf "    ❌ %-30s  TAKEN\n" "${name}.com"
    fi
  fi

  # Rest sorted by price
  CHEAPEST_SHOWN=false
  grep "^${name}|" "$RESULTS_FILE" 2>/dev/null | grep -v "^${name}|com|" | sort -t'|' -k4 -n | while IFS='|' read -r n tld status price; do
    [ -z "$tld" ] && continue
    [ "$price" = "-1" ] && continue

    # Skip over-budget items for now (show separately)
    if [ -n "$BUDGET" ] && [ "$price" -gt "$BUDGET" ] 2>/dev/null; then
      continue
    fi

    if [ "$status" = "AVAILABLE" ]; then
      LABEL=""
      if [ "$CHEAPEST_SHOWN" = false ]; then
        LABEL="  ← cheapest"
        CHEAPEST_SHOWN=true
      fi
      if [ "$tld" = "me" ]; then
        LABEL="  ← great for portfolios"
      fi
      printf "    ✅ %-30s  \$%s/year%s\n" "${n}.${tld}" "$price" "$LABEL"
    else
      printf "    ❌ %-30s  TAKEN\n" "${n}.${tld}"
    fi
  done

  if [ "$VARIANTS" = true ]; then
    echo ""
  fi
done

# Show over-budget .com if budget was set
if [ -n "$BUDGET" ]; then
  OVER_BUDGET=""
  for name in $NAMES; do
    COM_LINE=$(grep "^${name}|com|AVAILABLE" "$RESULTS_FILE" 2>/dev/null || true)
    if [ -n "$COM_LINE" ]; then
      PRICE=$(echo "$COM_LINE" | cut -d'|' -f4)
      if [ "$PRICE" -gt "$BUDGET" ] 2>/dev/null; then
        OVER_BUDGET="${OVER_BUDGET}    ✅ ${name}.com  \$${PRICE}/year\n"
      fi
    fi
  done
  if [ -n "$OVER_BUDGET" ]; then
    echo ""
    echo "  Also available (over budget):"
    printf "$OVER_BUDGET"
  fi
fi

echo ""
echo "══════════════════════════════════════"

# Cleanup
rm -f "$RESULTS_FILE"
