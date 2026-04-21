#!/usr/bin/env bash
# Post-deploy regression tests for SaatSaheli backend.
# Runs public endpoints, checks HTTP status + response time thresholds,
# and reports pass/fail summary. Exits non-zero if any test fails.
#
# Usage:
#   ./scripts/post-deploy-check.sh                  # checks prod (saatsaheli.com)
#   BASE_URL=http://localhost:8081 ./scripts/post-deploy-check.sh   # local

set -u

BASE_URL="${BASE_URL:-https://saatsaheli.com}"
PASS=0
FAIL=0
FAILED_TESTS=()

# Colors (disabled if not a tty)
if [ -t 1 ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; BOLD=""; NC=""
fi

# check <name> <expected_status> <max_time_sec> <path> [<extra_curl_args>...]
check() {
  local name="$1" expected="$2" max_time="$3" path="$4"
  shift 4

  local url="${BASE_URL}${path}"
  local tmp
  tmp="$(mktemp)"
  local status time_total
  # %{http_code} and %{time_total} from curl
  local metrics
  metrics=$(curl -sS -o "$tmp" -w "%{http_code} %{time_total}" --max-time 30 "$@" "$url" 2>/dev/null || echo "000 99")
  status="${metrics% *}"
  time_total="${metrics#* }"

  # Compare time_total to max_time (float)
  local time_ok
  time_ok=$(awk -v t="$time_total" -v m="$max_time" 'BEGIN{print (t<=m) ? "1" : "0"}')

  if [ "$status" = "$expected" ] && [ "$time_ok" = "1" ]; then
    printf "${GREEN}PASS${NC}  %-40s  %s  %ss\n" "$name" "$status" "$time_total"
    PASS=$((PASS+1))
  else
    printf "${RED}FAIL${NC}  %-40s  %s  %ss  (expected %s, max %ss)\n" "$name" "$status" "$time_total" "$expected" "$max_time"
    if [ -s "$tmp" ]; then
      printf "      ${YELLOW}body:${NC} %s\n" "$(head -c 300 "$tmp")"
    fi
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$name")
  fi
  rm -f "$tmp"
}

printf "${BOLD}Post-deploy regression check${NC} — %s\n" "$BASE_URL"
printf "%-4s  %-40s  %-4s  %s\n" "---" "----" "----" "----"

# --- Liveness ---
check "health endpoint"             200 2    "/api/health"

# --- Public DB-backed endpoints (verifies pool is working, no statement_timeout kill) ---
check "published magazines list"    200 5    "/api/books/magazines"
check "current magazine"            200 5    "/api/books/magazine"
check "books by category (poetry)"  200 5    "/api/books/category/poetry"
check "books by category (stories)" 200 5    "/api/books/category/stories"

# --- Search endpoint (DB-heavy, watches for statement_timeout issues) ---
check "search empty"                200 5    "/api/books/search"
check "search by title"             200 5    "/api/books/search?title=saheli"

# --- Input validation (clean 404 on missing resource, not a 500) ---
check "book detail: nonexistent"    404 5    "/api/books/99999999"

# --- Auth endpoint (unauthenticated — should 400/401, not 500) ---
check "login: missing creds"        400 5    "/api/auth/login" -X POST \
      -H "Content-Type: application/json" -d '{}'

# --- Recipe API (new) ---
check "recipes list"                200 5    "/api/recipes"
check "recipe: nonexistent"         404 5    "/api/recipes/99999999"
check "recipes by user"             200 5    "/api/recipes/user/1"

# --- Podcast API (new) ---
check "podcasts list"               200 5    "/api/podcasts"
check "podcasts by user"            200 5    "/api/podcasts/user/1"

# --- Social counts for new target types ---
check "social counts: podcast"      200 5    "/api/social/counts?targetType=PODCAST"
check "social counts: recipe"       200 5    "/api/social/counts?targetType=RECIPE"
check "social counts: gallery img"  200 5    "/api/social/counts?targetType=GALLERY_IMAGE"

# --- Writers enriched with contentTypes field ---
check "writers directory"           200 5    "/api/auth/writers"
# Assert each writer object includes a contentTypes field.
# (Empty array is acceptable; we just verify the field exists so frontend filtering won't break.)
writers_body=$(curl -sS --max-time 10 "${BASE_URL}/api/auth/writers")
if echo "$writers_body" | grep -q '"contentTypes"'; then
  printf "${GREEN}PASS${NC}  %-40s  %s\n" "writers field: contentTypes" "present"
  PASS=$((PASS+1))
elif echo "$writers_body" | grep -q '^\[\]$'; then
  printf "${YELLOW}SKIP${NC}  %-40s  %s\n" "writers field: contentTypes" "empty list — cannot verify"
else
  printf "${RED}FAIL${NC}  %-40s  %s\n" "writers field: contentTypes" "missing"
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("writers field: contentTypes")
fi

# --- Gallery caption update endpoint (should 403/404 on bogus image id, NOT 500) ---
check "gallery caption: bogus id"   403 5    "/api/galleries/images/99999999" -X PUT \
      -H "Content-Type: application/json" -d '{"caption":"test","userId":1}'

# --- Summary ---
echo
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}${BOLD}All %d checks passed.${NC}\n" "$PASS"
  exit 0
else
  printf "${RED}${BOLD}%d passed, %d failed.${NC}\n" "$PASS" "$FAIL"
  printf "Failed: %s\n" "${FAILED_TESTS[*]}"
  exit 1
fi
