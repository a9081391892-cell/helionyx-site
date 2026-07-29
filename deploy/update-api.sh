#!/usr/bin/env bash
set -euo pipefail

SOURCE_APP="/tmp/helionyx-deploy/server/app.py"
SOURCE_ENV="/tmp/helionyx-api.env"

test -f "$SOURCE_APP"
test -f "$SOURCE_ENV"
test -f /etc/systemd/system/helionyx-api.service
test -f /etc/nginx/snippets/helionyx-api.conf

/usr/bin/python3 -c 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' "$SOURCE_APP"
/usr/bin/install -o root -g root -m 0644 "$SOURCE_APP" /opt/helionyx-api/app.py
/usr/bin/install -o root -g root -m 0600 "$SOURCE_ENV" /etc/helionyx-api.env
/bin/systemctl restart helionyx-api.service

healthy=false
for _ in $(seq 1 20); do
  if /usr/bin/curl -fsS --max-time 3 http://127.0.0.1:8787/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done

if [ "$healthy" != "true" ]; then
  /bin/systemctl status helionyx-api.service --no-pager -l || true
  exit 1
fi

rm -f "$SOURCE_ENV"
echo "HELIONYX API updated"
