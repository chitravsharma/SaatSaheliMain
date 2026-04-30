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

# --- Advertisement placements (active list per placement) ---
# Whitelist: HEADER_TOP, FOOTER_TOP, SIDE_RAIL, ARTICLE_TOP, PODCAST_TOP.
# Each is a public GET that returns 200 + JSON array (empty if no active ads).
check "ads active: HEADER_TOP"      200 5    "/api/advertisements/active/HEADER_TOP"
check "ads active: FOOTER_TOP"      200 5    "/api/advertisements/active/FOOTER_TOP"
check "ads active: SIDE_RAIL"       200 5    "/api/advertisements/active/SIDE_RAIL"
check "ads active: ARTICLE_TOP"     200 5    "/api/advertisements/active/ARTICLE_TOP"
check "ads active: PODCAST_TOP"     200 5    "/api/advertisements/active/PODCAST_TOP"
# Unknown placement is coerced server-side to HEADER_TOP — endpoint must still 200.
check "ads active: unknown coerced" 200 5    "/api/advertisements/active/NOT_A_REAL_PLACEMENT"
# Mutating endpoint reachability — current behavior: returns 400 because the
# controller validates body.userId. TODO(security): controller does not enforce
# JWT yet (was missed in the X-User-Id removal sweep). Tighten this to 401 once
# AdvertisementController checks request.getAttribute("jwtUserId").
check "ad create: no auth (validated)" 400 5 "/api/advertisements" -X POST \
      -H "Content-Type: application/json" -d '{"title":"probe","placement":"ARTICLE_TOP","contentType":"text"}'

# --- Static asset checks (file system; only run when invoked from inside repo) ---
# Account avatar must match PublicProfile dimensions (140x180 desktop, 120x150 mobile, 10px corners).
ACCT_CSS="$(dirname "$0")/../FrontEnd/src/Account.css"
PUB_CSS="$(dirname "$0")/../FrontEnd/src/PublicProfile.css"
if [ -f "$ACCT_CSS" ] && [ -f "$PUB_CSS" ]; then
  if grep -q "width: 140px;" "$ACCT_CSS" \
     && grep -q "height: 180px;" "$ACCT_CSS" \
     && grep -q "border-radius: 10px;" "$ACCT_CSS" \
     && grep -q "width: 120px;" "$ACCT_CSS" \
     && grep -q "height: 150px;" "$ACCT_CSS" \
     && ! grep -A 5 "\.acct-profile-avatar {" "$ACCT_CSS" | grep -q "border-radius: 50%;"; then
    printf "${GREEN}PASS${NC}  %-40s  %s\n" "account avatar: matches public" "ok"
    PASS=$((PASS+1))
  else
    printf "${RED}FAIL${NC}  %-40s  %s\n" "account avatar: matches public" "Account.css avatar does not match PublicProfile dimensions"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("account avatar: matches public")
  fi
else
  printf "${YELLOW}SKIP${NC}  %-40s  %s\n" "account avatar: matches public" "css files not present (running outside repo)"
fi

# --- #24 SuperAdmin act-on-behalf (Phase 1) ---
# Content-write endpoints now require a JWT — body userId alone is no longer accepted.
check "book create: no auth"        401 5    "/api/books/create" -X POST \
      -H "Content-Type: application/json" -d '{"title":"probe","userId":1}'
check "book update: no auth"        401 5    "/api/books/1" -X PUT \
      -H "Content-Type: application/json" -d '{"userId":"1","title":"probe"}'
check "recipe create: no auth"      401 5    "/api/recipes" -X POST \
      -H "Content-Type: application/json" -d '{"recipeName":"probe","userId":1}'
check "recipe update: no auth"      401 5    "/api/recipes/1" -X PUT \
      -H "Content-Type: application/json" -d '{"userId":1}'
# Audit-log endpoint is SUPER_ADMIN only — 401 without auth, 403 for non-SA (tested in Batch 6).
check "audit log: no auth"          401 5    "/api/admin/audit-log"

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
