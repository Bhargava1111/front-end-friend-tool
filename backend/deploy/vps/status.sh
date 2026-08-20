#!/usr/bin/env bash
# Show status of all production services.
# Run on VPS: bash /var/www/mnxstore/status.sh
set -o pipefail

APP_DIR="/var/www/mnxstore"

print_svc() {
  local name="$1"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ${name}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if systemctl list-unit-files "${name}.service" &>/dev/null; then
    systemctl is-active "${name}" 2>/dev/null || echo "inactive"
    systemctl status "${name}" --no-pager -l 2>/dev/null | sed -n '2,6p' || true
  else
    echo "service not installed"
  fi
}

echo "Sri Mahalakshmi Stores — service status"
echo "Time: $(date -Is)"

print_svc "mnxstore-web"
print_svc "mnxstore-api"
print_svc "mnxstore-celery"
print_svc "nginx"
print_svc "postgresql"
print_svc "redis-server"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  API health check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v curl &>/dev/null; then
  curl -sf "http://127.0.0.1/api/v1/health/" | python3 -m json.tool 2>/dev/null || curl -sf "http://127.0.0.1/api/v1/health/" || echo "health check failed"
else
  echo "curl not installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Quick summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for svc in mnxstore-web mnxstore-api mnxstore-celery nginx postgresql redis-server; do
  state=$(systemctl is-active "${svc}" 2>/dev/null || echo "missing")
  printf "  %-18s %s\n" "${svc}:" "${state}"
done
echo ""
