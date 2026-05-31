# Deployment Guide — Forge Studio v3.0

## Production Deployment Options

### Option 1: systemd (Recommended for Single Server)

The simplest reboot-proof deployment using systemd services.

#### Prerequisites

- Linux server with Docker installed
- PostgreSQL 17 running on port 5434
- Redis 7 running on port 6379
- Node.js 22+ with pnpm

#### Step 1: Clone & Install

```bash
git clone https://github.com/Jahanzaib211/forge-studio.git
cd forge-studio
CI=true pnpm install --no-frozen-lockfile
```

#### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://litellm_user:litellm_password_123@localhost:5434/forge_studio
REDIS_URL=redis://localhost:6379/1
PORT=5051
NODE_ENV=development
JWT_SECRET=<generate-a-strong-secret>
ALLOWED_ORIGINS=https://your-domain.com
```

#### Step 3: Setup Database

```bash
npx drizzle-kit push
npx tsx server/seed.ts
```

#### Step 4: Install systemd Services

```bash
sudo bash scripts/install-systemd.sh
```

This creates 3 services:
- `forge-postgres.service` — Ensures PostgreSQL container is running
- `forge-redis.service` — Ensures Redis container is running
- `forge-studio.service` — Runs the Forge Studio server

#### Step 5: Start Services

```bash
sudo systemctl start forge-postgres forge-redis forge-studio
```

#### Step 6: Enable on Boot

```bash
sudo systemctl enable forge-postgres forge-redis forge-studio
```

#### Verify

```bash
# Check all services
sudo systemctl status forge-postgres forge-redis forge-studio

# Check health
curl http://localhost:5051/health

# View logs
sudo journalctl -u forge-studio -f
```

### Option 2: Docker Compose

For full containerized deployment:

```bash
docker compose up -d
```

This starts: PostgreSQL, Redis, Forge Studio, Nginx (optional).

### Option 3: PM2

For process management without systemd:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Nginx Reverse Proxy

### Basic Config

```nginx
server {
    listen 80;
    server_name forge.yourdomain.com;

    location / {
        proxy_pass http://localhost:5051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d forge.yourdomain.com
```

## Cloudflare Tunnel

For remote access without opening ports:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Create tunnel
cloudflared tunnel create forge-studio

# Configure
cat > ~/.cloudflared/config.yml << EOF
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: forge.yourdomain.com
    service: http://localhost:5051
  - service: http_status:404
EOF

# Run
cloudflared tunnel run forge-studio
```

## Health Check Cron

A healthcheck runs every 2 minutes:

```bash
# Check cron is installed
crontab -l | grep healthcheck

# View healthcheck logs
cat logs/healthcheck.log
```

If the server goes down, the cron automatically restarts it via `systemctl restart forge-studio`.

## Backup Strategy

### Database Backup

```bash
# Manual backup
docker exec litellm_postgres pg_dump -U litellm_user forge_studio > backup_$(date +%Y%m%d).sql

# Automated (add to cron)
0 2 * * * docker exec litellm_postgres pg_dump -U litellm_user forge_studio | gzip > /backups/forge_$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
gunzip < backup_20250101.sql.gz | docker exec -i litellm_postgres psql -U litellm_user forge_studio
```

## Monitoring

### Service Status

```bash
sudo systemctl status forge-studio
sudo journalctl -u forge-studio --since "1 hour ago"
```

### Health Endpoint

```bash
curl http://localhost:5051/health
# Returns: {"status":"healthy","version":"3.0.0","checks":{"postgres":...,"redis":...}}
```

### Log Files

| Log | Location |
|-----|----------|
| systemd journal | `sudo journalctl -u forge-studio` |
| Healthcheck | `logs/healthcheck.log` |
| Dev server | stdout (journal captures it) |

## Troubleshooting

### Server won't start

```bash
# Check if port 5051 is in use
lsof -i:5051

# Check database connection
docker exec litellm_postgres pg_isready

# Check Redis
docker exec futureagi-redis-1 redis-cli ping

# View detailed logs
sudo journalctl -u forge-studio -n 50
```

### Database connection refused

```bash
# Ensure PostgreSQL container is running
docker ps | grep postgres

# Restart if needed
docker restart litellm_postgres
```

### Build fails

```bash
# Clean and rebuild
rm -rf dist node_modules
CI=true pnpm install --no-frozen-lockfile
pnpm build
```

## Production Checklist

- [ ] `.env` configured with strong `JWT_SECRET`
- [ ] `ALLOWED_ORIGINS` set to your domain
- [ ] PostgreSQL running and accessible
- [ ] Redis running and accessible
- [ ] Database schema pushed (`npx drizzle-kit push`)
- [ ] Database seeded (`npx tsx server/seed.ts`)
- [ ] systemd services installed and enabled
- [ ] Nginx reverse proxy configured (if using)
- [ ] SSL certificate installed (if public-facing)
- [ ] Healthcheck cron installed
- [ ] Backup cron configured
- [ ] Firewall rules configured (only 80/443 open)
