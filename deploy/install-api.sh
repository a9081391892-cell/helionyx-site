#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  exec sudo -n "$0" "$@"
fi

SOURCE_DIR="${1:-/tmp/helionyx-deploy}"
ENV_FILE="${2:-/tmp/helionyx-api.env}"

test -f "$SOURCE_DIR/server/app.py"
test -f "$SOURCE_DIR/deploy/helionyx-api.service"
test -f "$SOURCE_DIR/deploy/nginx-api.conf"
test -f "$SOURCE_DIR/deploy/ensure-nginx-include.py"
test -f "$ENV_FILE"

install -d -m 0755 /opt/helionyx-api
install -m 0644 "$SOURCE_DIR/server/app.py" /opt/helionyx-api/app.py
install -m 0600 "$ENV_FILE" /etc/helionyx-api.env
install -m 0644 "$SOURCE_DIR/deploy/helionyx-api.service" /etc/systemd/system/helionyx-api.service
install -d -m 0755 /etc/nginx/snippets
install -m 0644 "$SOURCE_DIR/deploy/nginx-api.conf" /etc/nginx/snippets/helionyx-api.conf

mapfile -t NGINX_SITES < <(find /etc/nginx/sites-enabled -maxdepth 1 \( -type f -o -type l \) -print)
python3 "$SOURCE_DIR/deploy/ensure-nginx-include.py" "${NGINX_SITES[@]}"

if ! nginx -t; then
  for site in "${NGINX_SITES[@]}"; do
    real_site="$(readlink -f "$site")"
    if [ -f "$real_site.helionyx-api.bak" ]; then
      cp -a "$real_site.helionyx-api.bak" "$real_site"
    fi
  done
  nginx -t
  exit 1
fi

systemctl daemon-reload
systemctl enable --now helionyx-api.service
systemctl restart helionyx-api.service
systemctl reload nginx

curl -fsS --max-time 10 http://127.0.0.1:8787/api/health >/dev/null
rm -f "$ENV_FILE"
echo "HELIONYX API deployed"
