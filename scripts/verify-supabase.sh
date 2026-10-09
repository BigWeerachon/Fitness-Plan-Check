#!/usr/bin/env bash
# รัน supabase/migrations บน Postgres ชั่วคราวในเครื่อง แล้วตรวจ RLS / last-write-wins / การจำกัดซิงก์ (supabase/tests)
# ต้องมี PostgreSQL 15+ (initdb, pg_ctl, psql) — ไม่ต้องใช้บัญชี Supabase
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"
PORT="${PGPORT_VERIFY:-54329}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # Postgres ไม่ยอมรันด้วย root
  id -u fitnese_pg >/dev/null 2>&1 || useradd -M -s /usr/sbin/nologin fitnese_pg
  chown -R fitnese_pg "$WORK"
  RUN_AS=(runuser -u fitnese_pg --)
fi
cleanup() { "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

"${RUN_AS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=("${RUN_AS[@]}" "$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/tests/rls_test.sql"
