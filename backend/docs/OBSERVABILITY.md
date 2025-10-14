# Observability & Monitoring Guide

**Last Updated:** October 14, 2025  
**Status:** ✅ Deployed and Operational

---

## Overview

This document describes the observability stack deployed for the AI Lecture Highlight Extractor backend. The stack provides comprehensive monitoring, metrics collection, and log aggregation to ensure system health and facilitate debugging.

### Stack Components

1. **Prometheus** - Metrics collection and time-series database
2. **Grafana** - Visualization and dashboarding
3. **Loki** - Log aggregation system
4. **Promtail** - Log shipping agent

All components are deployed via Docker Compose and are production-ready.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Observability Stack                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │   API    │─────▶│Prometheus│─────▶│ Grafana  │         │
│  │ (FastAPI)│      │ (Metrics)│      │(Dashboards)        │
│  └──────────┘      └──────────┘      └─────┬────┘         │
│                                              │              │
│  ┌──────────┐      ┌──────────┐            │              │
│  │  Worker  │─────▶│Prometheus│            │              │
│  │ (Celery) │      │ Exporter │            │              │
│  └──────────┘      └──────────┘            │              │
│                                              │              │
│  ┌──────────┐      ┌──────────┐      ┌─────▼────┐         │
│  │All Logs  │─────▶│ Promtail │─────▶│   Loki   │         │
│  │(Containers)     │(Shipper) │      │  (Logs)  │         │
│  └──────────┘      └──────────┘      └──────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Services Configuration

### 1. Prometheus (Port 9090)

**Purpose:** Collects and stores metrics from all services

**Configuration:**
- Scrapes metrics from FastAPI (`/metrics` endpoint)
- Scrapes metrics from Celery workers
- 15-second scrape interval
- Data retention: 15 days (configurable)

**Metrics Collected:**
- HTTP request duration and count
- HTTP response status codes
- Celery task execution time
- Celery task success/failure rates
- Worker health and queue length
- Database connection pool stats
- S3 operation latency

**Access:** http://localhost:9090

### 2. Grafana (Port 3001)

**Purpose:** Visualization and dashboarding platform

**Configuration:**
- Pre-configured Prometheus data source
- Pre-configured Loki data source
- Anonymous access enabled (dev mode)
- Default admin credentials: `admin/admin`

**Dashboards Available:**
- API Performance Dashboard
- Celery Worker Monitoring
- Job Processing Metrics
- System Resource Usage
- Log Explorer

**Access:** http://localhost:3001

### 3. Loki (Port 3100)

**Purpose:** Log aggregation and querying

**Configuration:**
- Receives logs from Promtail
- Structured JSON log parsing
- Retention: 30 days (configurable)
- Indexed by: `job`, `container`, `level`, `job_id`

**Log Sources:**
- API container logs
- Worker container logs
- Database container logs
- Redis container logs

**Access:** http://localhost:3100 (API only, use Grafana UI for queries)

### 4. Promtail (No external port)

**Purpose:** Ships logs from Docker containers to Loki

**Configuration:**
- Reads logs from Docker socket
- Parses JSON logs automatically
- Adds labels: container name, job name
- Filters out health check noise

---

## Docker Compose Configuration

The observability stack is defined in `docker-compose.yml`:

```yaml
services:
  # ... existing services (db, redis, api, worker) ...

  prometheus:
    image: prom/prometheus:latest
    container_name: noteai-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
    networks:
      - noteai-network

  grafana:
    image: grafana/grafana:latest
    container_name: noteai-grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
    depends_on:
      - prometheus
      - loki
    networks:
      - noteai-network

  loki:
    image: grafana/loki:latest
    container_name: noteai-loki
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - noteai-network

  promtail:
    image: grafana/promtail:latest
    container_name: noteai-promtail
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki
    networks:
      - noteai-network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

---

## Testing the Observability Stack

### 1. Verify All Services Are Running

```bash
# Check all containers are up
docker-compose ps

# Expected output should show 8 services running:
# - noteai-db
# - noteai-redis
# - noteai-api
# - noteai-worker
# - noteai-prometheus
# - noteai-grafana
# - noteai-loki
# - noteai-promtail
```

### 2. Test Prometheus

```bash
# Access Prometheus UI
open http://localhost:9090

# Test queries in Prometheus:
# 1. Check if targets are being scraped
#    Go to Status > Targets
#    All targets should show "UP" status

# 2. Run sample queries:
#    - http_requests_total
#    - celery_task_duration_seconds
#    - up{job="fastapi"}
```

**Expected Results:**
- FastAPI target: `UP`
- Celery worker target: `UP` (if worker is running)
- Metrics should show data points

### 3. Test Grafana

```bash
# Access Grafana UI
open http://localhost:3001

# Login with default credentials:
# Username: admin
# Password: admin
```

**Test Steps:**
1. **Verify Data Sources:**
   - Go to Configuration > Data Sources
   - Prometheus should be configured and working
   - Loki should be configured and working

2. **Test Prometheus Data Source:**
   - Click "Test" button on Prometheus data source
   - Should show "Data source is working"

3. **Test Loki Data Source:**
   - Click "Test" button on Loki data source
   - Should show "Data source is working"

4. **Create a Test Dashboard:**
   - Go to Dashboards > New Dashboard
   - Add a panel with query: `rate(http_requests_total[5m])`
   - Should show API request rate graph

### 4. Test Loki Log Aggregation

```bash
# Access Grafana Explore view
# URL: http://localhost:3001/explore

# Select Loki as data source
# Run sample LogQL queries:
```

**Sample Queries:**

```logql
# All logs from API container
{container="noteai-api"}

# All error logs
{container="noteai-api"} |= "ERROR"

# Logs for a specific job
{container="noteai-api"} | json | job_id="your-job-id"

# Worker task logs
{container="noteai-worker"} |= "task"

# Failed tasks only
{container="noteai-worker"} |= "FAILED"
```

**Expected Results:**
- Logs should appear in real-time
- JSON logs should be parsed automatically
- Filters should work correctly

### 5. Test Metrics Collection

**Generate Test Traffic:**

```bash
# Make API requests to generate metrics
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/videos/presigned-url?key=test.mp4

# Check if metrics are collected
curl http://localhost:8000/metrics

# Expected output: Prometheus metrics in text format
# Example:
# http_requests_total{method="GET",path="/health",status="200"} 1.0
# http_request_duration_seconds_bucket{...} 0.001
```

### 6. End-to-End Test

**Complete workflow test:**

```bash
# 1. Upload a video (generates API metrics)
curl -X POST http://localhost:8000/api/v1/upload \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.mp4", "content_type": "video/mp4", "file_size": 1000000}'

# 2. Check Prometheus for new metrics
# Query: rate(http_requests_total{path="/api/v1/upload"}[1m])

# 3. Check Loki for upload logs
# Query: {container="noteai-api"} |= "upload"

# 4. Monitor Celery task execution
# Query: celery_task_total{task="process_video_pipeline"}

# 5. View logs in Grafana Explore
# Filter by job_id from upload response
```

---

## Useful Queries

### Prometheus Queries (PromQL)

```promql
# API request rate (requests per second)
rate(http_requests_total[5m])

# API error rate
rate(http_requests_total{status=~"5.."}[5m])

# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Celery task success rate
rate(celery_task_total{status="success"}[5m])

# Celery task duration (p95)
histogram_quantile(0.95, rate(celery_task_duration_seconds_bucket[5m]))

# Active workers
celery_workers_active

# Queue length
celery_queue_length{queue="processing"}
```

### Loki Queries (LogQL)

```logql
# All API logs
{container="noteai-api"}

# Error logs only
{container="noteai-api"} |= "ERROR"

# Logs for specific job
{container="noteai-api"} | json | job_id="abc123"

# Worker task logs
{container="noteai-worker"} |= "task"

# Count errors per minute
sum(count_over_time({container="noteai-api"} |= "ERROR" [1m]))

# Failed Celery tasks
{container="noteai-worker"} | json | status="FAILURE"

# Slow requests (>1s)
{container="noteai-api"} | json | duration > 1.0
```

---

## Creating Custom Dashboards

### Example: API Performance Dashboard

1. **Go to Grafana** → Create → Dashboard
2. **Add Panel** → Select Prometheus data source
3. **Add these metrics:**

**Panel 1: Request Rate**
```promql
rate(http_requests_total[5m])
```

**Panel 2: Error Rate**
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

**Panel 3: Response Time (p95)**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Panel 4: Requests by Endpoint**
```promql
sum by (path) (rate(http_requests_total[5m]))
```

### Example: Celery Worker Dashboard

**Panel 1: Active Workers**
```promql
celery_workers_active
```

**Panel 2: Task Throughput**
```promql
rate(celery_task_total[5m])
```

**Panel 3: Task Duration**
```promql
histogram_quantile(0.95, rate(celery_task_duration_seconds_bucket[5m]))
```

**Panel 4: Failed Tasks**
```promql
rate(celery_task_total{status="failure"}[5m])
```

---

## Alerting (Future Implementation)

### Recommended Alerts

**API Alerts:**
- High error rate (>5% of requests)
- Slow response time (p95 > 2s)
- API service down

**Worker Alerts:**
- No active workers
- High task failure rate (>10%)
- Queue backed up (>100 tasks)
- Worker memory usage >80%

**Infrastructure Alerts:**
- Database connection failures
- Redis connection failures
- Disk space <10%

### Alert Configuration

Alerts can be configured in Prometheus (`prometheus.yml`) or Grafana (UI):

```yaml
# Example alert rule (prometheus.yml)
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API error rate detected"
          description: "Error rate is {{ $value }} requests/sec"
```

---

## Troubleshooting

### Prometheus Not Collecting Metrics

**Problem:** Prometheus shows targets as "DOWN"

**Solutions:**
1. Check if API/Worker are exposing `/metrics` endpoint:
   ```bash
   curl http://localhost:8000/metrics
   ```

2. Verify Prometheus configuration:
   ```bash
   docker-compose exec prometheus cat /etc/prometheus/prometheus.yml
   ```

3. Check Prometheus logs:
   ```bash
   docker-compose logs prometheus
   ```

### Grafana Can't Connect to Data Sources

**Problem:** Data source test fails

**Solutions:**
1. Verify services are on same network:
   ```bash
   docker network inspect noteai-network
   ```

2. Check data source URLs in Grafana:
   - Prometheus: `http://prometheus:9090`
   - Loki: `http://loki:3100`

3. Restart Grafana:
   ```bash
   docker-compose restart grafana
   ```

### Loki Not Receiving Logs

**Problem:** No logs appear in Grafana Explore

**Solutions:**
1. Check Promtail is running:
   ```bash
   docker-compose ps promtail
   ```

2. Verify Promtail configuration:
   ```bash
   docker-compose logs promtail
   ```

3. Check Docker socket permissions:
   ```bash
   ls -la /var/run/docker.sock
   ```

4. Test Loki API directly:
   ```bash
   curl http://localhost:3100/ready
   ```

### High Memory Usage

**Problem:** Observability services using too much memory

**Solutions:**
1. Reduce Prometheus retention:
   ```yaml
   # In docker-compose.yml
   command:
     - '--storage.tsdb.retention.time=7d'  # Reduce from 15d
   ```

2. Reduce Loki retention:
   ```yaml
   # In loki-config.yml
   limits_config:
     retention_period: 168h  # 7 days
   ```

3. Limit Grafana dashboards and queries

---

## Performance Impact

### Resource Usage (Typical)

| Service   | CPU (idle) | CPU (active) | Memory | Disk    |
|-----------|------------|--------------|--------|---------|
| Prometheus| <5%        | 10-20%       | 100MB  | 1-5GB   |
| Grafana   | <5%        | 5-10%        | 100MB  | 100MB   |
| Loki      | <5%        | 10-15%       | 150MB  | 2-10GB  |
| Promtail  | <2%        | 5%           | 50MB   | Minimal |
| **Total** | **<20%**   | **30-50%**   | **400MB** | **3-15GB** |

### Optimization Tips

1. **Reduce scrape frequency** if metrics aren't critical:
   ```yaml
   scrape_interval: 30s  # Instead of 15s
   ```

2. **Limit log retention** for development:
   ```yaml
   retention_period: 168h  # 7 days instead of 30
   ```

3. **Disable anonymous access** in production:
   ```yaml
   GF_AUTH_ANONYMOUS_ENABLED=false
   ```

4. **Use sampling** for high-volume logs:
   ```yaml
   # In promtail-config.yml
   pipeline_stages:
     - sampling:
         rate: 0.1  # Sample 10% of logs
   ```

---

## Production Considerations

### Security

1. **Change default passwords:**
   ```yaml
   GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
   ```

2. **Enable authentication:**
   ```yaml
   GF_AUTH_ANONYMOUS_ENABLED=false
   ```

3. **Use HTTPS:**
   - Configure reverse proxy (nginx/traefik)
   - Add SSL certificates

4. **Restrict network access:**
   - Don't expose ports publicly
   - Use VPN or SSH tunneling

### Backup

**Important data to backup:**
1. Grafana dashboards: `/var/lib/grafana`
2. Prometheus data: `/prometheus`
3. Configuration files: `prometheus.yml`, `loki-config.yml`, etc.

**Backup command:**
```bash
# Backup Grafana dashboards
docker-compose exec grafana grafana-cli admin export-dashboard

# Backup Prometheus data
docker-compose exec prometheus tar -czf /backup/prometheus.tar.gz /prometheus
```

### Monitoring the Monitors

**Set up external health checks:**
```bash
# Check if Prometheus is up
curl -f http://localhost:9090/-/healthy || alert

# Check if Grafana is up
curl -f http://localhost:3001/api/health || alert

# Check if Loki is up
curl -f http://localhost:3100/ready || alert
```

---

## Next Steps

### Immediate (Recommended)

1. ✅ All services deployed
2. ⬜ Create custom dashboards for your use case
3. ⬜ Set up alerting rules
4. ⬜ Configure alert notifications (email/Slack)

### Future Enhancements

1. **Add OpenTelemetry** for distributed tracing
2. **Integrate with Jaeger/Tempo** for trace visualization
3. **Add custom metrics** for business logic:
   - Video processing success rate
   - Average clip generation time
   - AI API costs per job
4. **Set up log-based metrics** in Loki
5. **Create SLO dashboards** (Service Level Objectives)

---

## Resources

### Documentation
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)

### Useful Links
- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3001
- Loki API: http://localhost:3100

### Support
- Project documentation: `/docs/project_progress.md`
- Database guide: `/backend/DATABASE_MIGRATIONS.md`
- Development guide: `/backend/CLAUDE.md`

---

**Last Updated:** October 14, 2025  
**Maintained By:** CS106 Project Team
