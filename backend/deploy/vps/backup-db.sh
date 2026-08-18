#!/usr/bin/env bash
# Daily PostgreSQL backup — run via cron or manually.
set -o errexit
set -o pipefail

APP_DIR="/var/www/mnxstore"
ENV_FILE="${APP_DIR}/.env"
BACKUP_DIR="${APP_DIR}/backups"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

STAMP=$(date +%Y%m%d_%H%M%S)
OUT="${BACKUP_DIR}/mnxstore_${STAMP}.sql.gz"

# Parse DATABASE_URL
DB_URL="${DATABASE_URL}"
if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

pg_dump "${DB_URL}" | gzip > "${OUT}"
chmod 600 "${OUT}"

echo "Backup saved: ${OUT}"

# Prune old backups
find "${BACKUP_DIR}" -name "mnxstore_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
