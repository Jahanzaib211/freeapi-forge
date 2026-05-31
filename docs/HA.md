# High Availability Guide for Forge Studio

## 1. Architecture Overview

### Single Node Diagram

```
                    +-----------------+
                    |   Internet      |
                    +--------+--------+
                             |
                    +--------+--------+
                    |     Nginx       |
                    |  (Reverse Proxy)|
                    |   Port 80/443   |
                    +--------+--------+
                             |
                    +--------+--------+
                    |  Forge Studio   |
                    |  App (Node.js)  |
                    |   Port 5051     |
                    +---+--------+----+
                        |        |
               +--------+--+  +--+--------+
               | PostgreSQL |  |   Redis   |
               |   Port     |  |   Port   |
               |   5432     |  |   6379   |
               +------------+  +----------+
```

## 2. Single Node Deployment

### Docker Compose Setup (Current)

The current setup runs all services on a single node using Docker Compose.

```bash
# Start all services
docker compose up -d

# Verify services
docker compose ps
docker compose logs -f
```

### Service Ports

| Service    | Internal Port | External Port | Purpose              |
|-----------|--------------|---------------|----------------------|
| Nginx     | 80           | 80            | Reverse Proxy        |
| App       | 5051         | - (internal)  | Application Server   |
| PostgreSQL| 5432         | 5434          | Database             |
| Redis     | 6379         | 6379          | Cache/Session Store  |

## 3. Database High Availability

### PostgreSQL Streaming Replication

#### Primary Setup

1. Initialize primary with replication user:

```sql
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'repl_password';
```

2. Configure `postgresql.conf` on primary:

```
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64
synchronous_standby_names = 'replica1'
```

3. Configure `pg_hba.conf`:

```
host replication replicator replica1_ip/32 md5
```

#### Replica Setup

```bash
# Stop replica if running
docker stop forge-studio-postgres-replica

# Base backup from primary
docker exec forge-studio-postgres pg_basebackup -h primary_host -U replicator -D /var/lib/postgresql/data -P -R

# Start replica
docker start forge-studio-postgres-replica
```

#### Failover Procedures

1. **Detect primary failure**:
```bash
docker exec forge-studio-postgres pg_isready -h primary_host
```

2. **Promote replica**:
```bash
docker exec forge-studio-postgres-replica pg_ctl promote
```

3. **Update app connection**:
```bash
# Update DATABASE_URL to point to new primary
docker compose up -d app
```

## 4. Redis High Availability

### Redis Sentinel Setup

#### Sentinel Configuration (`sentinel.conf`)

```
sentinel monitor forge-master 127.0.0.1 6379 2
sentinel down-after-milliseconds forge-master 5000
sentinel failover-timeout forge-master 10000
sentinel parallel-syncs forge-master 1
```

#### Docker Compose for Sentinel

```yaml
services:
  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./redis/sentinel.conf:/etc/redis/sentinel.conf
    ports:
      - "26379:26379"
    networks:
      - forge-network

  redis-replica1:
    image: redis:7-alpine
    command: redis-server --replicaof redis 6379
    depends_on:
      - redis
    networks:
      - forge-network

  redis-replica2:
    image: redis:7-alpine
    command: redis-server --replicaof redis 6379
    depends_on:
      - redis
    networks:
      - forge-network
```

#### Automatic Failover

Sentinel automatically handles failover when primary fails:

1. Sentinel detects primary is down
2. Sentinel elects new primary from replicas
3. Sentinel notifies clients of new primary
4. Application reconnects automatically

## 5. Application Load Balancing

### Multiple App Instances

Update `docker-compose.yml` for multiple app instances:

```yaml
services:
  app:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
    networks:
      - forge-network
```

### Nginx Load Balancing

Update `nginx.conf` upstream:

```nginx
upstream forge_studio {
    least_conn;
    server app:5051 weight=1;
    server app2:5051 weight=1;
    server app3:5051 weight=1;
}
```

### Session Affinity

Since sessions are stored in Redis, no sticky sessions are needed. All app instances share the same session store.

## 6. Backup Strategy

### Automated Daily Backups

```bash
# Add to crontab (runs at 2 AM daily)
0 2 * * * /path/to/backup-cron.sh
```

### Off-site Backup Storage

```bash
# Sync to remote storage (S3, GCS, etc.)
aws s3 sync ./backups s3://your-backup-bucket/forge-studio/

# Or using rsync
rsync -avz ./backups user@remote-server:/backups/forge-studio/
```

### Recovery Objectives

| Metric | Target | Current |
|--------|--------|---------|
| RTO (Recovery Time Objective) | < 5 min | ~3 min |
| RPO (Recovery Point Objective) | < 1 hour | 24 hours |

### Backup Retention

- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep last 12 monthly backups

## 7. Monitoring & Alerting

### What to Monitor

1. **System Metrics**
   - CPU usage (alert > 80%)
   - Memory usage (alert > 85%)
   - Disk usage (alert > 90%)

2. **Application Metrics**
   - Request latency (alert > 500ms)
   - Error rate (alert > 1%)
   - Active connections

3. **Database Metrics**
   - Connection count (alert > 80% of max)
   - Query latency
   - Replication lag (alert > 10s)

4. **Redis Metrics**
   - Memory usage (alert > 80%)
   - Connected clients
   - Hit rate (alert < 80%)

5. **Provider Metrics**
   - API latency (alert > 2s)
   - Error rate
   - Quota remaining

### Alert Thresholds

```yaml
alerts:
  cpu_high:
    threshold: 80
    duration: 5m
    severity: warning

  memory_high:
    threshold: 85
    duration: 5m
    severity: warning

  disk_high:
    threshold: 90
    duration: 10m
    severity: critical

  db_connections_high:
    threshold: 80
    duration: 2m
    severity: warning

  redis_memory_high:
    threshold: 80
    duration: 5m
    severity: warning

  api_latency_high:
    threshold: 2000
    duration: 3m
    severity: warning
```

### Webhook Integration for Alerts

```bash
# Alert webhook endpoint
ALERT_WEBHOOK_URL="https://hooks.slack.com/services/xxx/yyy/zzz"

# Send alert function
send_alert() {
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$1\"}" \
    $ALERT_WEBHOOK_URL
}
```

## 8. Disaster Recovery Runbook

### Database Failure Steps

1. **Detect failure**:
```bash
docker exec forge-studio-postgres pg_isready
docker compose logs postgres
```

2. **Attempt restart**:
```bash
docker compose restart postgres
```

3. **If restart fails, restore from backup**:
```bash
./scripts/restore.sh ./backups/postgres_latest.sql.gz
docker compose restart app
```

4. **If data corruption, rebuild**:
```bash
docker volume rm forge-studio_postgres-data
docker compose up -d postgres
./scripts/restore.sh ./backups/postgres_latest.sql.gz
```

### Redis Failure Steps

1. **Detect failure**:
```bash
docker exec forge-studio-redis redis-cli ping
docker compose logs redis
```

2. **Attempt restart**:
```bash
docker compose restart redis
```

3. **If restart fails, clear and rebuild**:
```bash
docker volume rm forge-studio_redis-data
docker compose up -d redis
# Sessions will be lost, users need to re-login
```

### Full System Failure Steps

1. **Assess damage**:
```bash
docker compose ps
docker system df
```

2. **Rebuild from scratch**:
```bash
# Pull latest images
docker compose pull

# Remove old volumes
docker compose down -v

# Start fresh
docker compose up -d

# Restore database
./scripts/restore.sh ./backups/postgres_latest.sql.gz

# Verify
docker compose ps
curl http://localhost:5051/api/trpc/health.check
```

### Provider Outage Procedures

1. **Detect outage**:
```bash
# Check provider status
curl -I https://api.openai.com
curl -I https://api.anthropic.com
```

2. **Switch to fallback provider**:
```bash
# Update LITELLM_URL to point to fallback
# Or update provider configuration in app
```

3. **Enable queue mode**:
```bash
# If supported, queue requests for later processing
```

## 9. Scaling Guide

### Vertical vs Horizontal Scaling

| Scenario | Vertical | Horizontal |
|----------|----------|------------|
| CPU bottleneck | Add more cores | Add more instances |
| Memory bottleneck | Add more RAM | Add more instances |
| Disk I/O | Use SSD/NVMe | Use read replicas |
| Network | Upgrade bandwidth | Use CDN |

### Connection Pool Tuning

```typescript
// Database connection pool
const pool = {
  min: 2,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Redis connection pool
const redisPool = {
  min: 5,
  max: 50,
};
```

### Redis Memory Planning

```bash
# Check current memory usage
redis-cli info memory

# Set memory limit
redis-cli config set maxmemory 2gb

# Set eviction policy
redis-cli config set maxmemory-policy allkeys-lru
```

## 10. Quick Reference Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis

# Restart specific service
docker compose restart app

# Scale app instances
docker compose up -d --scale app=3

# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh ./backups/postgres_20240101_020000.sql.gz

# Monitor
docker stats
docker compose ps
```
