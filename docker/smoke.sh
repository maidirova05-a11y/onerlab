#!/usr/bin/env bash
# Проверка Docker-версии: собрать, поднять и убедиться, что сайт, база и
# админка работают. Запускается в CI (.github/workflows/docker.yml), можно и
# руками на сервере после восстановления.
#
#   docker/smoke.sh          собрать, поднять, проверить
#   docker/smoke.sh check    только проверить уже запущенное
set -euo pipefail
cd "$(dirname "$0")/.."

BASE=http://127.0.0.1:${APP_PORT:-3101}
SITE=${SITE_URL:-https://onerlab.kz}
CI_PASSWORD=ci-admin-password-123
CI_MARK="# создан docker/smoke.sh — тестовые секреты"
FAIL=0

if [ "${1:-}" != check ]; then
  if [ ! -f docker.env ]; then
    # Тестовые секреты — только для проверки, не для боевого запуска.
    { echo "$CI_MARK"; grep -v '^ADMIN_' docker.env.example; node scripts/admin-password.mjs "$CI_PASSWORD" | grep '^ADMIN_'; } > docker.env
  fi
  docker compose up -d --build
fi

for _ in $(seq 1 90); do
  curl -sf -o /dev/null "$BASE/robots.txt" && break
  sleep 2
done

ok() { echo "  ✓ $*"; }
bad() { echo "  ✗ $*"; FAIL=1; }
expect() { # expect <код> <путь> [curl-аргументы…]
  local want=$1 path=$2; shift 2
  local got; got=$(curl -s -o /dev/null -w '%{http_code}' "$@" "$BASE$path")
  [ "$got" = "$want" ] && ok "$path → $got" || bad "$path → $got (ожидалось $want)"
}

echo "onerlab: $BASE"
[ "$(docker compose ps -a migrate --format '{{.ExitCode}}')" = 0 ] && ok "миграции применены" || bad "миграции не прошли"
expect 200 /
expect 200 /privacy
expect 200 /sitemap.xml
expect 200 /robots.txt
grep -q "<link rel=\"canonical\" href=\"$SITE\"" <<<"$(curl -s "$BASE/")" && ok "canonical = $SITE" || bad "canonical не $SITE"

# Случайные телефон и адрес — чтобы повторная проверка не упёрлась в защиту
# от дублей и лимит запросов.
PHONE=+7701$(printf '%07d' $((RANDOM * 30 + RANDOM % 30)))
LEAD=$(curl -s -X POST "$BASE/api/leads" -H "Origin: $SITE" -H 'Content-Type: application/json' \
  -H "X-Real-IP: 198.51.100.$((RANDOM % 250))" \
  --data "{\"parentName\":\"Проверка Докер\",\"childNameAge\":\"Алия 9\",\"school\":\"Школа 1\",\"phone\":\"$PHONE\",\"consent\":true,\"website\":\"\"}")
grep -q '"success":true' <<<"$LEAD" && ok "заявка сохранена в базу" || bad "заявка: $LEAD"

# Пароль админки известен, только если docker.env создан этим скриптом
# (или его передали в SMOKE_ADMIN_PASSWORD).
if [ -n "${SMOKE_ADMIN_PASSWORD:-}" ] || grep -qx "$CI_MARK" docker.env; then
  expect 200 /api/admin/session -X POST -H "Origin: $SITE" -H 'Content-Type: application/json' \
    -H "X-Real-IP: 203.0.113.$((RANDOM % 250))" --data "{\"password\":\"${SMOKE_ADMIN_PASSWORD:-$CI_PASSWORD}\"}"
fi

if [ "$FAIL" -ne 0 ]; then
  docker compose ps -a
  docker compose logs --tail 80
  exit 1
fi
echo "onerlab: всё работает"
