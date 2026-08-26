#!/usr/bin/env bash
set -o errexit

python manage.py migrate --noinput

# Always ensure demo admins when allowed (lightweight; catalog import is separate).
if [ "${ALLOW_DEMO_SEED:-}" = "1" ]; then
  echo "Ensuring demo admin accounts..."
  ALLOW_DEMO_SEED=1 python manage.py ensure_demo_admins || echo "ensure_demo_admins finished with warnings"
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
