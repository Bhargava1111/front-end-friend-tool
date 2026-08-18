#!/usr/bin/env bash
set -o errexit

python manage.py migrate --noinput

# Always try demo seed when allowed (users first; catalog failures won't block admins).
if [ "${ALLOW_DEMO_SEED:-}" = "1" ]; then
  echo "Seeding demo accounts..."
  ALLOW_DEMO_SEED=1 python manage.py seed_demo || echo "seed_demo finished with warnings"
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
