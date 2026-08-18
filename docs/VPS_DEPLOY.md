# Deploy to Hostinger KVM 4 VPS

Production stack:

```
Internet → Nginx (:443) → Gunicorn (unix socket) → Django → PostgreSQL (local)
```

No Celery, Redis, or WebSockets in this project — not installed.

## Server

| Item | Value |
|------|-------|
| Provider | Hostinger KVM 4 |
| OS | Ubuntu LTS |
| IP | `200.234.39.88` |
| SSH user | `root` |
| App directory | `/var/www/mnxstore` |
| Service user | `mnxstore` |

## What gets installed

- Python 3 + venv
- PostgreSQL 16 (local, port 5432 not exposed publicly)
- **Redis** (local broker for Celery)
- **Celery worker** (async OTP, email, SMS, push notifications)
- Gunicorn (systemd)
- Nginx (reverse proxy + static/media)
- UFW firewall (SSH, HTTP, HTTPS)
- Certbot (optional, when domain is set)
- Daily DB backup cron

## Step 1 — Push deploy scripts to GitHub

Commit and push this repo so the VPS can clone it:

```bash
git add backend/deploy/
git commit -m "Add Hostinger VPS deployment scripts"
git push
```

## Step 2 — SSH into your VPS

From your PC (you enter the password in the terminal — never paste it in chat):

```bash
ssh root@200.234.39.88
```

## Step 3 — Run the install script

**From this monorepo** (recommended — includes deploy scripts):

```bash
apt-get update && apt-get install -y git
git clone --branch main YOUR_MONOREPO_URL /var/www/mnxstore
bash /var/www/mnxstore/backend/deploy/vps/install.sh
```

**From backend-only repo** (`pulagantigowthami143` — copy `backend/deploy/` to `deploy/` in that repo first):

```bash
git clone --branch main https://github.com/Bhargava1111/pulagantigowthami143.git /var/www/mnxstore
bash /var/www/mnxstore/deploy/vps/install.sh
```

**With a domain** (SSL auto-setup):

```bash
export DOMAIN="api.yourdomain.com"
bash /var/www/mnxstore/deploy/vps/install.sh
```

The script will:

1. Install system packages
2. Create `mnxstore` Linux user
3. Set up Python venv + pip install
4. Create PostgreSQL database (prompts for DB password securely)
5. Generate `.env` with `DJANGO_SECRET_KEY`
6. Run migrations + collectstatic + demo seed
7. Enable Gunicorn + Nginx + UFW

## Step 4 — Verify

```bash
curl http://200.234.39.88/api/v1/health/
```

Expected:

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok",
    "celery": "ok",
    "gunicorn": "ok",
    "nginx": "ok"
  }
}
```

**Check all service status:**

```bash
bash /var/www/mnxstore/status.sh
```

Or individually:

```bash
systemctl status mnxstore-api      # Gunicorn
systemctl status mnxstore-celery   # Celery worker
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
```

**Demo login:** `admin@mnxstore.in` / `Demo@12345`

## Step 5 — Point frontend to VPS API

Update your frontend `.env` (Lovable or local):

```
API_URL=http://200.234.39.88/api/v1
VITE_API_URL=http://200.234.39.88/api/v1
```

After SSL:

```
API_URL=https://api.yourdomain.com/api/v1
VITE_API_URL=https://api.yourdomain.com/api/v1
```

Also update backend `.env` on VPS:

```
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com
```

## SSL (when you have a domain)

1. Create DNS **A record**: `api.yourdomain.com` → `200.234.39.88`
2. Wait for DNS propagation (5–30 min)
3. On VPS:

```bash
certbot --nginx -d api.yourdomain.com
```

4. Edit `/var/www/mnxstore/.env`:

```
SECURE_SSL_REDIRECT=True
PUBLIC_API_URL=https://api.yourdomain.com
ALLOWED_HOSTS=api.yourdomain.com,200.234.39.88
```

5. Restart:

```bash
systemctl restart mnxstore-api
```

Test renewal:

```bash
certbot renew --dry-run
```

## Deploy updates

After pushing new code to GitHub:

```bash
ssh root@200.234.39.88
bash /var/www/mnxstore/deploy.sh
```

## Useful commands

| Task | Command |
|------|---------|
| **All service status** | `bash /var/www/mnxstore/status.sh` |
| Restart API (Gunicorn) | `systemctl restart mnxstore-api` |
| Restart Celery | `systemctl restart mnxstore-celery` |
| Restart Nginx | `systemctl reload nginx` |
| API logs | `journalctl -u mnxstore-api -f` |
| Celery logs | `journalctl -u mnxstore-celery -f` |
| Nginx errors | `tail -f /var/log/nginx/error.log` |
| Service status | `systemctl status mnxstore-api mnxstore-celery nginx postgresql redis-server` |
| DB backup (manual) | `sudo -u mnxstore /var/www/mnxstore/backup-db.sh` |
| Disk usage | `df -h` |
| RAM/CPU | `free -h && uptime` |
| PostgreSQL shell | `sudo -u postgres psql -d mnxstore` |

## Environment variables

See `backend/deploy/vps/env.production.template` for all production vars.

Never commit `/var/www/mnxstore/.env` to Git.

## Security notes

- PostgreSQL listens on `127.0.0.1` only (not exposed by UFW)
- Django runs as `mnxstore` user, not root
- `.env` is chmod 600
- `DEBUG=False` in production
- Backups stored in `/var/www/mnxstore/backups/` (download off-server regularly)

## Troubleshooting

**502 Bad Gateway**

```bash
journalctl -u mnxstore-api -n 50
ls -la /run/mnxstore/gunicorn.sock
systemctl restart mnxstore-api.socket mnxstore-api
```

**Database connection error**

```bash
sudo -u mnxstore bash -c 'source /var/www/mnxstore/.env && cd /var/www/mnxstore/backend && /var/www/mnxstore/venv/bin/python manage.py dbshell'
```

**Static files 404**

```bash
sudo -u mnxstore bash -c 'source /var/www/mnxstore/.env && cd /var/www/mnxstore/backend && /var/www/mnxstore/venv/bin/python manage.py collectstatic --noinput'
```

## SSH key (recommended)

After confirming password login works, add your SSH public key:

```bash
# On your PC
ssh-copy-id root@200.234.39.88
```

Only disable password auth after key login is confirmed working.
