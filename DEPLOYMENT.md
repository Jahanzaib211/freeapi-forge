# Forge Studio — Deployment Guide

## Quick Start

### One-Click Install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Jahanzaib211/forge-studio/main/install.sh | bash
```

The installer handles everything: dependencies, build, database, PM2, nginx.

---

## Option A: Docker Compose

### Prerequisites
- Docker and Docker Compose
- 4GB RAM minimum
- Ports 5051, 5434, 6379 available

### Steps

```bash
git clone https://github.com/Jahanzaib211/forge-studio.git
cd forge-studio
cp .env.example .env  # edit with your values
docker compose up -d
docker compose exec app pnpm tsx server/seed.ts
```

Open http://localhost:5051/

### Services

| Service | Port | Purpose |
|---------|------|---------|
| app | 5051 | Forge Studio application |
| postgres | 5434 | PostgreSQL database |
| redis | 6379 | Redis cache |
| nginx | 80 | Reverse proxy |

### Profiles

```bash
# With Ollama for local models
docker compose --profile with-ollama up -d
```

---

## Option B: Manual Setup

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL 17+
- Redis 7+

### Steps

```bash
git clone https://github.com/Jahanzaib211/forge-studio.git
cd forge-studio
pnpm install
pnpm tsx server/seed.ts
pnpm dev
```

Open http://localhost:5051/

---

## Production Deployment

### 1. Build

```bash
pnpm build
```

This produces:
- `dist/index.js` — bundled server (esbuild)
- `dist/public/` — frontend build (Vite)

### 2. PM2 Process Manager

```bash
npm install -g pm2

# Start in production mode
pm2 start ecosystem.production.cjs

# Save process list (survives reboots)
pm2 save
```

### 3. Systemd Auto-Start (Reboot-Proof)

```bash
# One-time setup (needs sudo)
sudo env PATH=$PATH pm2 startup systemd -u $USER --hp $HOME

# Save current process list
pm2 save
```

### 4. Optional Services

Edit `services.conf` to enable/disable optional services:

```ini
litellm-proxy=true
qdrant=true
mcp-sse=true
mcp-gateway-docker=true
ai-lab-dashboard=true
```

Start them:
```bash
pm2 start ecosystem.services.cjs
pm2 save
```

### 5. Nginx Reverse Proxy

```bash
sudo cp nginx/forge-studio.conf /etc/nginx/sites-available/forge-studio
sudo ln -sf /etc/nginx/sites-available/forge-studio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Cloudflare Tunnel (Remote Access)

```bash
# Install cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create and configure
cloudflared tunnel create forge-studio
bash scripts/setup-cloudflare-tunnel.sh

# Start via PM2
pm2 start cloudflared --name cloudflared -- tunnel run forge-studio
pm2 save
```

Cloudflare Dashboard settings:
- SSL/TLS → **Full (Strict)**
- Always Use HTTPS → **ON**
- HSTS → **ON**
- Bot Fight Mode → **ON**
- WAF → **ON**
- Security Level → **High**

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `PORT` | No | 5051 | Server port |
| `NODE_ENV` | No | development | `development` or `production` |
| `JWT_SECRET` | Yes | — | Random string for session signing |
| `LITELLM_URL` | No | — | LiteLLM proxy URL (optional) |
| `LITELLM_API_KEY` | No | — | LiteLLM API key (optional) |
| `ALLOWED_ORIGINS` | No | — | Comma-separated CORS origins |

---

## Backup & Restore

### Backup

```bash
bash scripts/backup.sh
```

Backs up PostgreSQL and Redis to `/var/backups/forge-studio/`.

### Automated Backup (cron)

```bash
crontab -e
# Add: 0 2 * * * /home/jahanzaib/forge-studio/scripts/backup-cron.sh
```

### Restore

```bash
bash scripts/restore.sh /var/backups/forge-studio/forge_studio_YYYYMMDD_HHMMSS.sql.gz
```

---

## Architecture

```
Internet → Cloudflare (SSL/CDN/WAF)
  └─ Cloudflare Tunnel → cloudflared
       └─ nginx (:8080)
            └─ forge-studio (:5051)
                 ├─ PostgreSQL (:5432)
                 ├─ Redis (:6379) — Docker
                 ├─ Qdrant (:6333)
                 ├─ LiteLLM Proxy (:5050)
                 └─ Local Model (one at a time)
                      ├─ Qwen 14B MoE (:8082)
                      ├─ DeepSeek V2 Lite (:8085)
                      └─ Qwopus 9B MTP (:8083)
```

---

## Troubleshooting

### forge-studio won't start

```bash
# Check logs
pm2 logs forge-studio --lines 50

# Check dependencies
bash scripts/ensure-deps.sh

# Restart
pm2 restart forge-studio
```

### GPU out of memory

```bash
# Check VRAM usage
nvidia-smi

# Go to Local Models page and switch to a smaller model
# Or stop other GPU processes
```

### Redis connection refused

```bash
# Check Docker container
docker ps | grep redis

# Start it
docker start futureagi-redis-1
```

### PostgreSQL connection refused

```bash
# Check status
pg_isready

# Start
sudo systemctl start postgresql
```
