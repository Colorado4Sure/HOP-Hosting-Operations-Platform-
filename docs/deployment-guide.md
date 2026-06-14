# Deployment Guide

## Production Deployment with Docker Compose

The recommended production deployment runs HOP as Docker containers.

### 1. Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4+ vCPU |
| RAM | 2 GB | 8 GB |
| Storage | 20 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 2. Install Docker on the Server

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Deploy HOP

```bash
# Clone or upload your HOP repository
git clone https://github.com/yourorg/hop.git /opt/hop
cd /opt/hop

# Create production .env
cp .env.example .env
nano .env  # Fill in all required values with real secrets
```

**Critical production values:**
```dotenv
NODE_ENV=production
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<another-64-char-random-string>
ENCRYPTION_KEY=<32-char-hex-string>
POSTGRES_PASSWORD=<strong-database-password>
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=<strong-password>
FRONTEND_URL=https://dashboard.yourdomain.com
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<smtp-password>
```

```bash
# Start production stack
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f dashboard
```

---

## Nginx Reverse Proxy (HTTPS)

Install Nginx + Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

`/etc/nginx/sites-available/hop`:

```nginx
# API
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}

# Dashboard
server {
    listen 80;
    server_name dashboard.yourdomain.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name dashboard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hop /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.yourdomain.com -d dashboard.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## GitHub Actions Auto-Deploy

The `.github/workflows/deploy.yml` workflow auto-deploys on every push to `main`.

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Your server's IP or hostname |
| `DEPLOY_USER` | SSH username (e.g., `ubuntu`) |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment |

### GitHub Variables (non-secret)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api/v1` |

### Deployment Flow

```
push to main
    │
    ├── Build & push Docker images to ghcr.io
    │
    └── SSH into server → docker compose pull → docker compose up -d
```

---

## Horizontal Scaling

### Scale API workers

The API is **stateless** — run multiple instances behind a load balancer:

```yaml
# docker-compose.scale.yml
services:
  api:
    deploy:
      replicas: 3
```

```bash
docker compose up -d --scale api=3
```

Add a load balancer (Nginx, Traefik, or HAProxy) in front of the API instances.

### Scale BullMQ workers

Queue workers can be scaled independently of the API:

```bash
docker compose up -d --scale api=2
# Workers share the same Redis queue — work is distributed automatically
```

### Shared Sessions

Because JWT is stateless, multiple API instances work without session synchronization. Refresh token revocation uses the database (shared across instances).

---

## Environment Variables for Production

```dotenv
# Never use these defaults in production
SEED_ADMIN_PASSWORD=<strong-unique-password>
JWT_SECRET=<min-64-chars-of-entropy>
ENCRYPTION_KEY=<32-hex-chars>

# Point dashboard at the public API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
FRONTEND_URL=https://dashboard.yourdomain.com

# Lock Swagger docs off in production (automatic when NODE_ENV=production)
NODE_ENV=production
```

---

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | Overall: API + DB + Redis |
| `GET /api/v1/health/db` | Database connection |
| `GET /api/v1/health/queue` | Redis / queue connection |

Use these with your load balancer and uptime monitoring (e.g., UptimeRobot, Better Uptime).

---

## Graceful Shutdown

The API listens for `SIGTERM` and `SIGINT` signals:
1. Stops accepting new connections
2. Drains in-flight HTTP requests (up to 10 seconds)
3. Closes BullMQ queue connections
4. Disconnects Prisma
5. Exits with code `0`

Docker sends `SIGTERM` on `docker compose stop` — `dumb-init` in the container ensures signals are forwarded correctly.

---

## Backup Strategy

```bash
# Daily automated backup at 2am
crontab -e

0 2 * * * cd /opt/hop && ./scripts/backup-db.sh /var/backups/hop >> /var/log/hop-backup.log 2>&1
```

Consider syncing backups to object storage (S3, Cloudflare R2):
```bash
# After backup
aws s3 cp /var/backups/hop/latest.sql.gz s3://your-bucket/hop-backups/
```

---

## Monitoring & Observability

**Structured logs** — all API logs are JSON (production) or pretty-printed (dev):

```bash
docker compose logs api --follow | grep '"level":"error"'
```

**Recommended monitoring stack:**
- **Logs**: Loki + Grafana, or Datadog, or Sentry
- **Metrics**: Prometheus + Grafana (instrument via `@willsoto/nestjs-prometheus`)
- **Uptime**: Better Uptime, UptimeRobot, or Freshping
- **Error tracking**: Sentry (add `@sentry/node` to the API)

**Request tracing:** Every request gets a UUID in the `X-Request-ID` header (sent by client or generated by API) which is included in all log lines for that request.
