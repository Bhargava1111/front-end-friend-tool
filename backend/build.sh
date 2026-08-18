#!/usr/bin/env bash
set -o errexit

# collectstatic imports Django settings; a placeholder URL is enough at build time.
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql://build:build@localhost:5432/build"
fi

pip install -r requirements.txt
python manage.py collectstatic --noinput
