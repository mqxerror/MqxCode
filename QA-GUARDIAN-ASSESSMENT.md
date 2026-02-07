# QA Guardian (QA-Dam3oun) - Full Architecture & Feasibility Assessment

**Date**: 2026-02-05
**Assessment Framework**: BMAD Multi-Agent Review
**Agents**: Winston (Architect), Murat (TEA), Mary (Analyst), Barry (Solo Dev)
**Target**: Production deployment for 5 heavy Shopify stores on single VPS (38.111.111.206)

---

## Executive Summary

**Overall Production Readiness Score: 5.7 / 10**

QA Guardian is a genuinely ambitious unified test management platform with real functionality -- Playwright E2E, K6 load testing, Lighthouse performance, axe-core accessibility, ZAP security scanning, and 170+ MCP tools for AI agent integration. The test execution engine is the standout component (8/10). However, the platform is **not production-ready for paying customers** due to critical gaps in security hardening, operational infrastructure, scalability, and zero automated test coverage of its own codebase.

**Key Findings:**
- 293K LOC across 690 files, built in ~11 days with heavy AI assistance (432 commits)
- Zero test files (.test.ts / .spec.ts) in the entire codebase
- CI/CD pipeline explicitly suppresses test failures (`|| echo "non-blocking"`)
- JWT authentication uses a hardcoded fallback secret
- No database backups, no monitoring/alerting, no log aggregation
- No Shopify-specific features despite targeting Shopify stores
- Single-process architecture will OOM under concurrent load from 5 stores
- Bus factor of 1 -- no one else can maintain the system

---

## Production Readiness Scorecard

| Area | Rating | Grade | Key Issue |
|------|:------:|:-----:|-----------|
| Backend Architecture | 7/10 | B- | Solid Fastify stack, but tsx in production and missing security hardening |
| Frontend Architecture | 7/10 | B- | Modern React Query stack, clean hooks, but bundle size concerns |
| Database Schema | 7/10 | B- | Comprehensive with 115+ indexes, but no migration strategy |
| Caching Layer | 7/10 | B- | Redis with in-memory fallback, but no password or eviction policy |
| Test Execution Engine | 8/10 | B+ | Genuinely functional: real Playwright, K6, Lighthouse, axe-core |
| AI/MCP Integration | 7/10 | B- | Production-grade AI router with failover, 170+ real tool handlers |
| Test Coverage (Own Code) | 0/10 | F | Zero automated tests, non-blocking CI |
| Scalability | 4/10 | D | Single process, no execution queue, will OOM under concurrent load |
| Security Hardening | 3/10 | D | JWT default secret, passwordless Redis, no HTTPS, no CSP |
| Operational Readiness | 3/10 | D- | No backups, no monitoring, no log aggregation, no cleanup jobs |
| Monitoring & Observability | 2/10 | D- | No alerting, no error tracking, no structured logging |
| Shopify Readiness | 0/10 | F | Generic platform, zero Shopify-specific features |
| Market Presence | 1/10 | F | No reviews, no app store listing, no public website |
| Solo Dev Feasibility | 3/10 | D | 12-16 weeks minimum before demo, $11-28/hr effective rate |

---

## Part 1: Architecture Review (Architect Agent - Winston)

### Target: 5 Heavy Shopify Stores on Single VPS (38.111.111.206)

### 1. BACKEND ARCHITECTURE -- Rating: 7/10

#### Server Framework
- **Fastify** with TypeScript, running via `tsx` (no build step in production).
- Socket.IO for real-time test run updates.
- JWT authentication with Swagger docs.

**Strengths:**
- Clean route organization: auth, projects, test-suites, test-runs, schedules, monitoring, DAST, SAST, MCP tools, reports, services-status, step-templates.
- Global error handler that sanitizes stack traces from client responses.
- Request timeout middleware to prevent 502 gateway timeouts.
- Rate limiting (5000 req/min per IP, in-memory store).
- Graceful shutdown handlers for SIGTERM/SIGINT.
- Health check with DB and cache status reporting.

**Concerns:**
- **Running tsx in production** (`CMD ["npx", "tsx", "src/index.ts"]` in Dockerfile). This is a development-time TypeScript executor. For production, a compiled `tsc` build + `node dist/index.js` would be significantly faster on cold-start and uses less memory. There is a `build` script in package.json but it is not used in Docker.
- **Rate limiting is in-memory**, not distributed. With a single server this is acceptable, but the code comments say "for production, use Redis for distributed rate limiting" -- which means the authors acknowledge it is not production-grade.
- **JWT secret fallback** (`'default-secret-change-in-production'` at line 108 of index.ts). If `JWT_SECRET` env var is not set, any attacker who discovers this default can forge tokens.

#### Database Layer
- **PostgreSQL 15** with `pg` driver, connection pool (max 20 connections, 30s idle timeout, 10s connect timeout).
- Schema is auto-initialized on startup with `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- **48+ tables** covering organizations, users, projects, test suites, tests, runs, visual baselines, flaky tests, webhooks, MCP connections/audit logs, monitoring (uptime, DNS, TCP, performance, transactions, status pages), GitHub integrations, DAST/SAST, schedules, audit logs, AI generated tests, reports, step templates.
- **115+ indexes** defined for performance.
- Transaction support with proper BEGIN/COMMIT/ROLLBACK pattern.

**Strengths:**
- Comprehensive schema with proper foreign keys, cascading deletes, unique constraints.
- Composite indexes for common query patterns (e.g., `idx_test_runs_org_created`).
- UUID primary keys throughout.
- SSL support for Supabase connections.

**Concerns:**
- **No database migrations strategy in production** -- the schema is applied as one massive SQL string on every startup. If a column needs to be added or altered, the `CREATE TABLE IF NOT EXISTS` pattern will silently skip changes. The `node-pg-migrate` dependency exists in package.json but is not wired into the startup flow.
- No table partitioning for time-series data (check_results, test_runs). For 5 stores running frequently, `test_runs` and `check_results` will grow unbounded.
- No data retention/cleanup for test runs, screenshots, traces, videos. The `monitoring_settings` table has retention_days but there is no evidence of automated cleanup jobs.
- In-memory fallback when DB is unavailable means data is silently lost on container restart without warning to the user.

#### Caching Layer
- **Redis 7** with `ioredis`, singleton `CacheService` class.
- Falls back to in-memory `Map<string, {value, expiresAt}>` if Redis unavailable.
- SCAN-based pattern invalidation (non-blocking).
- `getOrSet` cache-aside pattern.
- Periodic cleanup of expired in-memory entries.

**Strengths:**
- Robust fallback pattern.
- Key prefixing (`qa-guardian:`).
- TTL-based expiry.
- Proper connection lifecycle management.

**Concerns:**
- No Redis password configured in docker-compose.yml (exposed without authentication).
- No Redis maxmemory policy configured -- can fill up and crash.

### 2. FRONTEND ARCHITECTURE -- Rating: 7/10

#### Stack
- React 18, React Router v6, Vite 5, TypeScript, TailwindCSS 3.
- State: Zustand + TanStack React Query v5.
- UI: Radix UI primitives, Lucide icons, Framer Motion, Recharts.
- Real-time: socket.io-client.

#### Pages
- **75+ page components** across dashboard, projects, test suites, test details, run history, security, monitoring, AI tools, MCP chat, analytics, settings, etc.
- Well-organized with dedicated pages per feature area.

#### Hooks Architecture
- **18 hook files** in `/hooks/api/` covering runs, projects, suites, tests, dashboard, analytics, schedules, monitoring, flaky tests, visual review, MCP chat, AI workspace, settings, security, organization, real-time cache invalidation.
- Clean re-export barrel (`index.ts`).
- Proper React Query patterns: paginated queries, infinite queries, mutation hooks with cache invalidation.

**Strengths:**
- TanStack React Query for data fetching means automatic caching, refetching, deduplication.
- Real-time cache invalidation via WebSocket events.
- Virtual scrolling support (`@tanstack/react-virtual`).
- Clean separation: hooks handle data, pages handle UI.

**Concerns:**
- **Bundle size risk**: 75+ pages loaded in a SPA. No evidence of route-level code splitting (lazy loading). Libraries like `recharts`, `framer-motion`, `jspdf`, `jszip` are heavy. For 5 Shopify store customers, initial load time may be slow.
- No evidence of a production build optimization check (tree-shaking, chunk splitting config in vite.config).
- `lucide-react` at v0.323 with full import could bloat the bundle with unused icons.

### 3. TEST EXECUTION ENGINE -- Rating: 8/10

#### E2E Testing (Playwright)
- **Real Playwright execution** with Chromium installed in the Docker image.
- Full feature set: navigate, click, fill, wait, assert_text, screenshot, visual_checkpoint, accessibility_check, console error assertion.
- **AI-powered selector healing**: When an element is not found, the system tries alternate selectors sorted by confidence, with project-configurable auto-heal thresholds. Falls back to visual fingerprint matching (pixelmatch-based sliding window search).
- Browser context with tracing, video recording, console log capture, network request capture.
- Live screenshot streaming via Socket.IO during execution.
- Device emulation presets (mobile/tablet/desktop).
- URL validation to catch placeholder domain usage.

#### Visual Regression
- Dedicated `visual-test-executor.ts` with pixelmatch-based comparison.
- Multi-viewport support.
- Baseline management with branch support.
- Anti-aliasing tolerance settings.
- Ignore regions (by coordinate or CSS selector).
- Storage quota protection.

#### K6 Load Testing
- **Real K6 execution** via `child_process.spawn('k6', ...)`.
- K6 binary installed in Docker image.
- Script validation (syntax, imports, thresholds).
- Real-time progress parsing from K6 stdout.
- Summary JSON export and threshold evaluation.

#### Lighthouse Performance
- Real Lighthouse v12 audits (`lighthouse` package in dependencies).
- Desktop/mobile presets.
- CSP issue detection, login page detection, mixed content detection.
- Performance score thresholds (LCP, CLS).

#### Accessibility Testing
- Real axe-core via `@axe-core/playwright`.
- WCAG A/AA/AAA support.
- Configurable failure thresholds per impact level.

**Strengths:**
- This is a genuinely functional test execution engine, not stubs.
- Supports all 5 test types: E2E, visual regression, load (K6), performance (Lighthouse), accessibility (axe-core).
- The Docker image installs all required tools: Chromium, K6, gitleaks, semgrep.
- Only Chromium is installed (not Firefox/WebKit) -- the code supports all three but Docker only has Chromium, which is the right production trade-off.

**Concerns:**
- **Memory pressure**: Each Playwright browser context consumes 100-300MB. Running 5 concurrent test suites (one per Shopify store) could consume 1.5GB+ just for browsers, on top of the Node.js process (~200MB), K6, and Lighthouse.
- No explicit concurrency control -- if all 5 stores trigger test runs simultaneously, browser launches are unbounded.
- `NODE_OPTIONS=--max-old-space-size=2048` is set in docker-compose (2GB heap limit). This could be insufficient for concurrent visual regression tests (large PNGs in memory for pixelmatch).
- No test execution queue (BullMQ is in dependencies but not wired into the execution flow). Tests are executed synchronously when triggered.

### 4. AI/MCP INTEGRATION -- Rating: 7/10

#### MCP Tool Handlers
- **27 handler modules** registered in the central registry.
- Categories: projects, test-suites, test-execution, test-results, artifacts, search-analysis, test-management, security, monitoring, visual-regression, performance, lighthouse, accessibility, load-testing, k6-scripts, ai-provider, ai-analysis, analytics, flaky-tests, organization, analytics-extended, settings, ai-generation, ai-chat, core-web-vitals, additional-tools, site-analysis, reporting.
- Handlers are real implementations that call the backend API via internal HTTP requests.

#### AI Router
- **Kie.ai (primary) + Anthropic (fallback)** dual-provider architecture.
- Automatic failover on timeout, rate limit, server error, network error.
- Circuit breaker pattern per provider.
- Cost tracking with savings calculation.
- Hot-swap provider switching without restart.
- Vision API support (Anthropic only).
- Complexity-based model routing (Haiku for simple, Sonnet 4 for complex).

#### MCP Chat
- Multi-turn tool execution loop (up to 5 turns).
- 55-second maximum execution time.
- Real tool execution through the handler registry.
- Massive system prompt (~870 lines) with all 170+ tools documented.
- Error handling with retry instructions for the AI.

**Strengths:**
- Production-grade AI router with failover, circuit breakers, and cost tracking.
- The MCP tools are real, not stubs -- they make actual API calls.
- Vision API for visual regression analysis.

**Concerns:**
- The MCP chat system prompt is extremely large (~4000+ tokens before the user even sends a message). This significantly increases cost per chat interaction.
- No rate limiting on AI API calls -- a malicious user could burn through the AI budget rapidly.
- No authentication check on MCP tool execution routes (the `/execute` and `/chat` endpoints accept any request that passes CORS).

### 5. SCALABILITY ASSESSMENT -- Rating: 4/10

#### For 5 Heavy Shopify Stores:

**Concurrent Test Runs:**
- No execution queue. If all 5 stores trigger runs simultaneously, the server will try to launch 5+ Chromium browser instances concurrently.
- Estimated memory per concurrent test: ~300MB (browser) + ~100MB (Lighthouse/K6).
- **Worst case**: 5 stores x 2 concurrent tests each = 10 browsers = ~3GB just for browsers.
- With 2GB Node.js heap limit and system overhead, this will OOM on a 4GB VPS.

**Database Growth:**
- Each test run creates: 1 test_run row + screenshots (base64 in results JSONB) + traces + videos.
- Visual regression stores PNG files on disk (baselines directory).
- No automated cleanup. After 6 months with 5 active stores:
  - test_runs table: ~50,000+ rows
  - check_results: ~500,000+ rows (if monitoring is active)
  - Disk: 10-50GB of screenshots, traces, videos.

**VPS Capacity (Single Server):**
- **Minimum recommended**: 8GB RAM, 4 vCPU, 100GB SSD.
- PostgreSQL: ~1GB
- Redis: ~256MB
- Node.js backend: ~2GB (with max-old-space-size)
- Chromium instances: 1-3GB
- K6/Lighthouse: 0.5-1GB during load tests
- ZAP (DAST): ~1GB
- OS overhead: ~1GB
- **Total estimated need**: 8-10GB RAM minimum.

**Single Points of Failure:**
- Single backend process (no clustering, no PM2, no worker processes).
- Single PostgreSQL instance (no replication).
- No CDN for frontend static assets.
- No reverse proxy configuration visible (Nginx/Caddy not in docker-compose).

### 6. CRITICAL GAPS -- Rating: 3/10 (Production Gaps)

#### Security Vulnerabilities

1. **JWT Secret Fallback**: `'default-secret-change-in-production'` -- if `JWT_SECRET` env var is missing, authentication is completely broken. An attacker can forge any JWT.

2. **Redis without password**: Docker-compose runs Redis without `requirepass`. If the VPS firewall has any hole, Redis is completely exposed.

3. **CORS in development mode**: When `NODE_ENV=development`, CORS allows ANY origin. If the production deployment accidentally runs in dev mode, cross-origin attacks are possible.

4. **No input sanitization visible**: The route handlers parse request bodies but there is no explicit SQL injection protection beyond parameterized queries (which `pg` handles). However, JSONB fields stored from user input could contain XSS payloads.

5. **No HTTPS configuration**: The backend serves HTTP only. TLS termination must be handled externally (e.g., by Caddy/Nginx reverse proxy, which is not in the docker-compose).

#### Operational Gaps

6. **No database migration system in use**: Schema changes require manual intervention or restart. No rollback capability.

7. **No backup strategy**: No pg_dump, no WAL archiving, no point-in-time recovery.

8. **No monitoring/alerting**: No Prometheus metrics, no Grafana, no PagerDuty. The health endpoint exists but nobody is watching it.

9. **No log aggregation**: Logs go to stdout. No ELK, no Loki, no centralized logging.

10. **No test execution queue**: BullMQ is in dependencies but not wired in. A flood of test requests will crash the server.

11. **No cleanup jobs**: Screenshots, videos, traces, and test results grow unbounded.

#### Missing for Shopify Use Case

12. **No Shopify-specific test templates**: The system is generic. Creating Shopify checkout/product/cart tests would need manual setup.

13. **No multi-tenant isolation**: All 5 stores share the same database, same execution engine. A misbehaving test from one store could starve resources for others.

14. **No SLA/uptime guarantee infrastructure**: Single server, no redundancy.

### Architect Summary Scorecard

| Area | Rating (1-10) | Notes |
|------|:---:|-------|
| Backend Architecture | **7** | Solid Fastify stack with good patterns, but tsx in production and missing security hardening |
| Database Schema | **7** | Comprehensive schema with good indexing, but no migration strategy and no cleanup |
| Caching Layer | **7** | Redis with in-memory fallback is pragmatic, but missing password and eviction policy |
| Frontend Architecture | **7** | Modern React Query stack, clean hooks, but possible bundle size issues |
| Test Execution Engine | **8** | Genuinely functional: real Playwright, K6, Lighthouse, axe-core. Most impressive part |
| AI/MCP Integration | **7** | Production-grade AI router with failover, 170+ real tool handlers |
| Scalability | **4** | Single process, no execution queue, will OOM under concurrent load |
| Security Hardening | **3** | JWT default secret, passwordless Redis, no HTTPS, no input sanitization audit |
| Operational Readiness | **3** | No backups, no monitoring, no log aggregation, no cleanup jobs |
| Shopify Readiness | **4** | Generic platform, no Shopify-specific features, no multi-tenant resource isolation |

**OVERALL PRODUCTION READINESS SCORE: 5.7 / 10**

**Verdict: NOT production-ready for paying customers**, but has an exceptionally strong foundation. The test execution engine is genuinely impressive. However, the platform would likely fail under real load from 5 Shopify stores due to no execution queue, no resource isolation, critical security gaps, no operational infrastructure, and no data cleanup strategy.

#### Top 5 Priorities to Reach Production-Ready (8/10):

1. **Add BullMQ execution queue** with concurrency limits (max 2-3 concurrent browser instances). This is the single most important change.
2. **Harden security**: Require `JWT_SECRET` env var (fail startup if missing), add Redis password, audit CORS for production.
3. **Add database migrations**: Wire `node-pg-migrate` into the startup flow instead of raw `CREATE TABLE IF NOT EXISTS`.
4. **Add cleanup jobs**: Cron-based cleanup of old test runs, screenshots, traces, and videos. Implement the retention_days setting.
5. **Compile TypeScript for production**: Use `tsc` build + `node dist/index.js` instead of `tsx` in Docker.

---

## Part 2: Production Stability (TEA Agent - Murat)

**Assessment Date**: 2026-02-05
**Assessed By**: Murat (TEA -- Test Engineering Architect)
**Production URL**: qa.pixelcraftedmedia.com

### EXECUTIVE SUMMARY

**Overall Production Readiness: D+ (Not Ready for Paying Customers)**

This is a large, ambitious application with ~364 backend TypeScript files and ~326 frontend TSX files running across 6 Docker services. It has extensive feature breadth (1473 features tracked, 95.4% claimed passing). However, the underlying engineering discipline required for production reliability with paying customers is largely absent. The system would fail a paying customer on its first bad day.

### 1. DEPLOYMENT ARCHITECTURE -- Grade: C+

**What runs** (from docker-compose.yml):

| Service | Image | Purpose |
|---------|-------|---------|
| postgres | postgres:15-alpine | Primary database |
| redis | redis:7-alpine | Caching (with AOF persistence) |
| backend | Custom (node:20-slim + Playwright + k6 + gitleaks + semgrep) | API server, test execution |
| frontend | Custom (nginx:1.25-alpine) | SPA serving |
| mcp-server | Same as backend | MCP protocol server |
| zap | zaproxy/zaproxy:stable | DAST scanning |

**Positives:**
- Health checks on all critical services
- `restart: unless-stopped` on all containers
- `depends_on` with `condition: service_healthy` for startup ordering
- `dumb-init` for proper signal handling in backend container
- Named volumes for data persistence
- Graceful shutdown handlers (SIGTERM/SIGINT) in `index.ts`

**Risks:**
- Backend container is massive: includes Playwright + Chromium + k6 + gitleaks + semgrep + Python/pip. This is a single monolithic image doing API serving AND test execution simultaneously. A Chromium OOM or runaway k6 load test will kill the API for all users.
- Backend runs via `npx tsx src/index.ts` -- TypeScript is transpiled at runtime in production. No pre-compiled build. This means slower cold starts and higher memory baseline.
- MCP server is a second instance of the same massive backend image. Double the attack surface, double the memory.
- Memory capped at 2GB (`--max-old-space-size=2048`) but Chromium alone can consume that.

### 2. TEST COVERAGE -- Grade: F

**Test files found in project source (excluding node_modules): ZERO**

- `backend/src/**/*.test.ts` -- 0 files
- `backend/src/**/*.spec.ts` -- 0 files
- `frontend/src/**/*.test.ts` -- 0 files
- `frontend/src/**/*.test.tsx` -- 0 files

There are test scripts in `backend/src/mcp/test-*.ts` (approximately 50+ files), but these are manual integration test scripts, not automated unit/integration tests run by a test framework.

**CI/CD** (`.github/workflows/deploy.yml`):
- The pipeline runs `npm test || echo "Tests not configured (non-blocking)"` -- tests are explicitly non-blocking and silently swallowed.
- Lint is also non-blocking: `npm run lint || echo "Lint warnings (non-blocking)"`
- Deploy is `git reset --hard origin/main` on the VPS, then `docker compose build && up`.
- The deploy health check uses `|| echo "pending"` -- it does not actually fail the deploy if the health check fails.

**Verdict**: There is literally no automated quality gate. Any code pushed to `main` goes directly to production regardless of quality. The "95.4% feature completion" refers to feature tracking in a SQLite database, not actual test coverage.

### 3. ERROR HANDLING -- Grade: C

**Positives:**
- Global error handler in `backend/src/index.ts` (lines 168-184) that strips stack traces from 500 errors
- Request timeout middleware (`backend/src/middleware/timeout.ts`) with path-specific timeouts (30s default, up to 5 min for load tests)
- No empty catch blocks found (`catch() {}` = 0 occurrences)

**Negatives:**
- No `process.on('unhandledRejection')` or `process.on('uncaughtException')` handlers -- an unhandled promise rejection in Node 20 will crash the process
- 185 occurrences of `console.log/console.error/console.warn` across 20 backend source files -- no structured logging
- Fastify's built-in logger is enabled (`logger: true` in app initialization), but all application code uses raw `console.log` instead
- No external error tracking service (Sentry, Datadog, etc.) -- errors go to container stdout and are lost unless someone reads Docker logs

### 4. DATABASE RELIABILITY -- Grade: C+

**Positives:**
- PostgreSQL connection pooling: max 20 connections, 30s idle timeout, 10s connection timeout
- Transaction support with proper BEGIN/COMMIT/ROLLBACK
- Health check endpoint with latency measurement
- Comprehensive schema with proper foreign keys, UUIDs, and indexes (100+ indexes defined)
- Graceful degradation: falls back to in-memory storage if Postgres is unavailable

**Negatives:**
- **No migrations directory exists**: `backend/migrations/` is empty (0 files). Package.json has `node-pg-migrate` installed, but no actual migration files. The entire schema (1273 lines of SQL) is embedded in `initializeSchema()` and runs as a single `CREATE TABLE IF NOT EXISTS` block on every startup.
- Only 2 connection retry attempts with 1 second delay -- insufficient for real recovery scenarios
- The fallback to in-memory storage means a Postgres connection failure silently degrades to losing all data persistence. Users would not know their data is not being saved.
- No connection pool monitoring or alerting
- No query timeout configuration -- a single slow query can hold a connection indefinitely
- `pool` is exported directly (`export { pool }`) -- any code can bypass the service layer

### 5. KNOWN ISSUES AUDIT -- Grade: C-

**35 pending features** from the backlog database, by category:

| Category | Count | Examples |
|----------|-------|---------|
| Performance/Frontend | 14 | Component splitting, lazy loading, virtual scrolling, React.memo |
| CodeQuality/Frontend | 6 | 32 unsafe `as any` assertions, 50+ console.log in production code |
| UX/Frontend | 5 | Skeleton loaders, empty states, mobile responsive |
| Accessibility/Frontend | 3 | ARIA labels, keyboard navigation, form labels |
| Security/Backend | 2 | **Feature #121: Fix MCP server CORS wildcard and JWT default secret**, Feature #122: Add Zod validation for all endpoints |
| Performance/Backend | 2 | N+1 queries, cache missing endpoints |
| Performance/Database | 1 | Replace SELECT * with explicit columns |

**Feature #121 is critical** -- it explicitly calls out the JWT default secret and CORS wildcard as known unfixed security issues.

### 6. SECURITY POSTURE -- Grade: D

#### Hardcoded Secrets (CRITICAL)
From `backend/src/index.ts` line 107:
```typescript
secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
```
If the `JWT_SECRET` environment variable is not set, every JWT token is signed with a publicly known secret. Anyone can forge authentication tokens.

From `docker-compose.yml` line 12:
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-QaGuardian2024Secure}
```
The default database password is hardcoded in the compose file, which is committed to the repository.

#### CORS
The CORS configuration in `index.ts` has a proper origin allowlist for production, but in development mode (`NODE_ENV === 'development'`) it allows all origins. The ZAP API disables its API key entirely: `api.disablekey=true`.

#### Authentication Middleware
`backend/src/middleware/auth.ts` is reasonably well-structured:
- JWT verification with token blacklist checking
- API key authentication with SHA-256 hashing
- Internal service token for MCP-to-backend communication
- Role-based access control (RBAC)
- Scope-based access control for API keys
- UUID validation on organization IDs

#### Security Headers
The nginx configuration (`frontend/nginx.conf`) includes:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection (deprecated but harmless)
- Referrer-Policy

**Missing**: No Content-Security-Policy header on the backend. No `helmet` middleware. No CSRF protection.

#### Rate Limiting
Rate limiting exists in-memory at 5000 requests/minute per IP. This is:
- Not distributed (each container has its own counter)
- Very generous (5000 req/min is barely limiting anything)
- Easily bypassed by rotating IPs

### 7. MONITORING & OBSERVABILITY -- Grade: D-

| Capability | Status |
|-----------|--------|
| Health endpoint | YES -- `/health` returns service status with DB latency |
| Structured logging | NO -- raw `console.log` everywhere |
| Error tracking (Sentry etc.) | NO |
| APM (Datadog, New Relic etc.) | NO |
| Metrics/Prometheus | NO |
| Log aggregation | NO -- logs go to Docker stdout |
| Alerting | NO -- no alerting on backend errors or outages |
| Uptime monitoring | PARTIAL -- the platform monitors OTHER apps, but nothing monitors QA Guardian itself |

The health check endpoint is solid (checks database, Redis, filesystem, Socket.IO), but nobody is polling it. If the backend crashes at 3 AM, nobody knows until a user reports it.

### 8. OPERATIONAL RISK ASSESSMENT (For a Paying Customer with 5 Shopify Stores)

#### Scenario: VPS Goes Down
- **Impact**: Total outage. Single VPS, no redundancy, no failover.
- **Recovery**: Manual SSH, `docker compose up -d`. No automated recovery.
- **Data loss risk**: Docker volumes are on the VPS disk. If the disk fails, all data (Postgres, Redis, screenshots, baselines) is lost permanently.
- **Backup**: There is NO automated backup. No `pg_dump` cron job. No volume backups. No offsite storage.

#### Scenario: Test Run OOMs
- **Impact**: Since the backend container runs both the API server AND Playwright test execution in the same process, a Chromium/k6 OOM will kill the backend container. All API requests fail until Docker restarts it.
- **Blast radius**: Every user of the platform loses access simultaneously.

#### Scenario: Redis Crashes
- **Impact**: Graceful degradation. The cache service falls back to in-memory Map storage. Performance degrades but functionality continues. Redis has AOF persistence, so data survives restart.
- **Rating**: This is actually well-handled.

#### Scenario: Database Fills Up
- **Impact**: PostgreSQL stops accepting writes. The application silently falls back to in-memory storage if the connection fails, meaning data appears to save but is actually lost on restart.
- **Warning**: There is no disk space monitoring, no query to check `pg_database_size()`, and no data retention policy for the many time-series tables which will grow indefinitely.

#### Scenario: Need to Roll Back a Bad Deploy
- **Recovery**: `git reset --hard` to a previous commit, then rebuild. No tagged releases. No blue-green deployment. Downtime is guaranteed during rebuild.

### TEA Report Card Summary

| Category | Grade | Key Issue |
|----------|-------|-----------|
| Deployment Architecture | C+ | Monolithic container, runtime TypeScript compilation |
| Test Coverage | **F** | Zero automated tests, non-blocking CI |
| Error Handling | C | No unhandled rejection handler, no structured logging |
| Database Reliability | C+ | No real migrations, silent fallback to in-memory |
| Known Issues | C- | 35 known bugs including critical security item |
| Security Posture | **D** | JWT default secret, hardcoded DB password, no CSP |
| Monitoring & Observability | **D-** | No alerting, no error tracking, no log aggregation |
| Operational Resilience | **D-** | No backups, no redundancy, no recovery procedures |

### TOP 5 RISKS THAT WILL HIT A PAYING CUSTOMER

1. **No backups**: A single disk failure destroys all customer data permanently. This is the highest-severity risk.

2. **JWT default secret in code**: If the environment variable is ever missing or misconfigured (container recreation, env file issue), anyone can forge admin tokens and access all customer data.

3. **Zero test coverage with auto-deploy**: Any broken commit goes straight to production. The CI pipeline explicitly suppresses test failures. There is no safety net.

4. **No monitoring or alerting**: When the system breaks (and it will), nobody knows until a customer complains. For a paying customer with 5 Shopify stores depending on this for QA, undetected downtime directly impacts their business.

5. **OOM crash takes down everything**: Running test execution (Playwright + Chromium) in the same container as the API server means a single runaway test can cause a total platform outage for all users.

### MINIMUM ACTIONS BEFORE ACCEPTING PAYMENT

1. Set up automated daily `pg_dump` backups to offsite storage (S3, etc.)
2. Remove or rotate the hardcoded JWT fallback secret; fail hard if `JWT_SECRET` is not set
3. Separate test execution from the API server (separate worker container)
4. Add basic uptime monitoring (even a free UptimeRobot) with alerting
5. Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers
6. Add at least smoke tests that block deployment if they fail
7. Set up real database migrations instead of the monolithic `initializeSchema()` approach

---

## Part 3: Market Competition (Analyst Agent - Mary)

### For the Shopify QA Testing Market

### 1. CRITICAL FINDING: "QA Beast" Does Not Exist as a Product

After exhaustive searching across G2, Capterra, Product Hunt, the Shopify App Store, GitHub, and general web search, **there is no product called "QA Beast" in the QA testing market**. Zero results. No website, no app listing, no reviews, no social media presence, nothing.

This means one of the following:
- The name was misremembered or confused with another product
- It is a pre-launch product with zero public presence
- It is an internal/private tool not yet on the market
- It simply does not exist

### 2. The Real Competitive Landscape for Shopify QA Testing

The Shopify QA testing market is segmented into three tiers:

#### Tier 1: Shopify-Native Apps (Inside Shopify App Store)

| Tool | What It Does | Pricing | Reviews |
|------|-------------|---------|---------|
| **Uptime** (Jagged Pixel) | Automated store monitoring, UI tests, outage alerts, 3rd-party app monitoring | $29-$299/mo | 5.0 stars (31 reviews) |
| **TestCart** (Valar Digital) | Automated UI testing, Shopify status monitoring, alerts | $19-$199/mo | 0 reviews (launched Mar 2024) |
| **TestingBot** | Store monitoring, downtime alerts | Unknown | Minimal presence |
| **Store Watchers** | Was automated testing/monitoring | **Delisted** from Shopify App Store |

#### Tier 2: General-Purpose AI Testing Platforms (External)

| Tool | What It Does | Pricing | Shopify-Specific? |
|------|-------------|---------|-------------------|
| **Virtuoso QA** | NLP test authoring, self-healing, visual testing | Enterprise (contact sales) | Yes - has Shopify-specific guides |
| **testRigor** | Plain English test creation, multi-platform | Contact sales | Yes - has Shopify landing page |
| **Octomind** | AI-generated Playwright tests, auto-fix | Starts ~$146/mo, freemium | No Shopify-specific features |
| **QA.tech** | Autonomous AI QA agent, bug reports | $89-$99/mo per user | No |
| **QA Wolf** | Managed QA service, 80% E2E coverage | ~$8,000/mo (200 tests) | No |

#### Tier 3: DIY Frameworks

| Tool | What It Does | Pricing |
|------|-------------|---------|
| **Playwright** | Browser automation framework | Free/OSS |
| **Cypress** | JavaScript E2E testing | Free-$250/mo |
| **Selenium** | Browser automation | Free/OSS |

### 3. Feature-by-Feature Comparison Matrix

| Capability | QA Guardian | Uptime (Shopify App) | Virtuoso QA | Octomind | QA Wolf |
|-----------|------------|---------------------|------------|----------|---------|
| **E2E Testing** | Yes (Playwright) | Limited (3-10 UI tests) | Yes (NLP) | Yes (AI-generated) | Yes (managed) |
| **Visual Regression** | Yes (built-in) | No | Yes | No | Limited |
| **Load Testing** | Yes (K6 integration) | No | No | No | No |
| **Accessibility Testing** | Yes (axe-core) | No | No | No | No |
| **Security Scanning (DAST)** | Yes (ZAP) | No | No | No | No |
| **Performance/Lighthouse** | Yes (built-in) | No | Partial (CWV) | No | No |
| **AI Test Generation** | Pending (30 features) | No | Yes (NLP) | Yes (AI agent) | Yes (human-assisted) |
| **AI Self-Healing** | Partial (UI done, ML pending) | No | Yes | Yes | No (human maintenance) |
| **MCP/AI Agent Integration** | Yes (170+ tools) | No | No | Yes (MCP server) | No |
| **Root Cause Analysis** | Yes (completed) | No | No | No | Yes (human-verified) |
| **Flaky Test Management** | Yes (completed) | No | No | No | Yes (human) |
| **Test Recording** | Yes (visual recorder) | No | Yes (NLP) | No | Yes (browser extension) |
| **Shopify-Specific Features** | **No** | **Yes** (Shopify status, app monitoring) | **Yes** (commerce NLP) | No | No |
| **CI/CD Integration** | Not documented | N/A (runs in Shopify) | Yes | Yes | Yes |
| **Shopify App Store Listing** | **No** | **Yes** | No | No | No |

### 4. Brutally Honest Assessment of QA Guardian

#### Where QA Guardian Has Genuine Advantages

**1. Unified Platform Breadth (Strongest Advantage)**
No other tool in this space combines E2E + Visual Regression + Load Testing + Accessibility + Security Scanning + Performance Auditing in a single platform. This is legitimately unique. Competitors force you to buy 3-5 separate tools to get this coverage.

**2. MCP-Native Architecture (Unique Differentiator)**
170+ Model Context Protocol tools is a real differentiator for AI agent workflows. Only Octomind has started down this path with their MCP server. For organizations building AI-powered development pipelines, this matters.

**3. Price-to-Feature Ratio (Potential)**
If self-hosted or offered at SMB pricing, QA Guardian could dramatically undercut the market. QA Wolf charges $8,000/month. Virtuoso QA is enterprise-only. Even Uptime charges $299/month for just 10 UI tests.

**4. Depth of Implementation**
The feature database shows tracked features with passing tests. This is a working product with real functionality, not vaporware.

#### Where QA Guardian Has Serious Weaknesses

**1. Zero Shopify-Specific Features (Critical Gap)**
This is the elephant in the room. For a Shopify QA testing market analysis, QA Guardian has:
- No Shopify App Store listing
- No Shopify status page monitoring
- No Shopify-specific terminology in test authoring
- No Shopify theme/app integration
- No Shopify checkout flow templates
- No Shopify third-party app monitoring (Klaviyo, Recharge, Yotpo, etc.)
- No Shopify Liquid template testing

Uptime and Virtuoso QA both understand Shopify commerce workflows natively. QA Guardian is a general-purpose platform.

**2. No Market Presence**
Zero reviews on any platform. No Shopify App Store listing. No public website for the product. In a market where Uptime already has 31 five-star reviews and Virtuoso QA has enterprise case studies, this is a significant disadvantage.

**3. Incomplete AI Features (Honest Assessment)**
The spec says "AI-Powered Intelligence" but:
- AI Test Generation: 30 features **pending** (0% complete)
- AI Test Healing ML core: **pending** (15 features)
- AI Self-Healing: UI/tools done, but the actual ML that makes it work is not built

The competitors (Virtuoso QA, Octomind, testRigor) have shipping AI test generation today. QA Guardian's AI story is partially a promise.

**4. Pending Quality Issues**
35 features remain pending, including:
- Security: CORS wildcard fix, JWT default secret fix -- these are security vulnerabilities
- Code quality: 32 unsafe `as any` type assertions, 50+ console.log statements in production
- Accessibility: Missing ARIA labels, keyboard navigation, form labels
- No unit tests for React Query hooks
- No mobile responsive design

### 5. Pricing Model Comparison

| Tool | Model | Monthly Cost | What You Get |
|------|-------|-------------|-------------|
| **Uptime** | SaaS subscription | $29-$299 | 2-10 UI tests, monitoring |
| **TestCart** | SaaS subscription | $19-$199 | 1-10 automated tests |
| **Virtuoso QA** | Enterprise license | Undisclosed (likely $500+/mo) | Full platform, NLP, visual |
| **Octomind** | Usage-based + subscription | ~$146+/mo | AI test generation, Playwright |
| **QA.tech** | Per-user subscription | $89-$99/user/mo | AI agent testing |
| **QA Wolf** | Managed service | ~$8,000/mo | 200 tests, full maintenance |
| **QA Guardian** | **Not defined** | **Unknown** | Unified platform (self-hosted?) |

QA Guardian has no defined pricing model. This needs to be resolved before any market positioning discussion is meaningful.

### 6. Target Market Overlap Analysis

| Segment | Uptime | Virtuoso | QA Guardian | Overlap? |
|---------|--------|----------|------------|----------|
| Solo Shopify merchants | Primary | No | No | Low |
| SMB Shopify stores ($1-10M) | Primary | Secondary | Potential | Medium |
| Shopify Plus Enterprise | Secondary | Primary | Not ready | Low |
| General web app teams | No | Yes | Yes | N/A |
| AI-forward dev teams | No | Partial | Primary | Low for Shopify |

**The honest truth**: QA Guardian and the Shopify-native tools are not really competing in the same market today. Uptime serves Shopify merchants who want simple monitoring. QA Guardian serves engineering teams who want comprehensive test management. These are different buyers with different needs.

### 7. Market Positioning Recommendation

#### Option A: Do NOT Target Shopify Market (Recommended)

QA Guardian's strengths (unified multi-type testing, MCP-native AI, deep platform) are wasted on Shopify merchants who want simple store monitoring. Instead, position QA Guardian for:
- **Software engineering teams** building complex web applications
- **AI-native development shops** using Claude/MCP in their workflow
- **Organizations needing unified test management** across multiple test types
- **DevOps teams** who want one dashboard for E2E + visual + load + security + accessibility

#### Option B: Enter Shopify Market (Requires Major Investment)

If you must target Shopify, you would need:
1. Build a Shopify App Store listing and OAuth integration
2. Add Shopify status page monitoring
3. Add Shopify-specific test templates (checkout, cart, product pages)
4. Add Shopify third-party app monitoring (Klaviyo, Recharge, etc.)
5. Add Liquid template testing support
6. Create no-code/low-code test authoring for non-technical merchants
7. Price at $29-$199/month to compete with Uptime/TestCart
8. Fix the 35 pending features (especially security vulnerabilities)

This is 6-12 months of dedicated work to enter a market where a $29/month competitor already has 5-star reviews.

#### Option C: Hybrid -- "Shopify Plus Testing Platform" (Niche Play)

Target only Shopify Plus Enterprise customers ($2,000+/month Shopify plans). These merchants:
- Have engineering teams that can use a developer-oriented tool
- Need comprehensive testing beyond simple monitoring
- Care about visual regression (brand consistency)
- Care about performance (Core Web Vitals affect SEO and conversion)
- Care about security (PCI compliance)

This positions against Virtuoso QA, not Uptime. You compete on:
- Unified platform (they only do E2E + visual)
- MCP/AI agent integration (they do not have this)
- Security scanning (they do not have this)
- Load testing (they do not have this)
- Price (undercut their enterprise pricing)

### Analyst Summary Scorecard

| Dimension | QA Guardian | Best Shopify Competitor | Winner |
|-----------|------------|------------------------|--------|
| Feature breadth | 9/10 | 5/10 (Virtuoso) | QA Guardian |
| Feature depth (per type) | 6/10 | 8/10 (Virtuoso for E2E) | Competitor |
| AI capabilities (shipping) | 4/10 | 7/10 (Octomind/Virtuoso) | Competitor |
| AI capabilities (planned) | 8/10 | 7/10 | QA Guardian (if delivered) |
| Shopify-specific | 0/10 | 9/10 (Uptime) | Competitor |
| Market presence | 1/10 | 6/10 (Uptime) | Competitor |
| Production readiness | 5/10 | 8/10 | Competitor |
| MCP/AI agent integration | 10/10 | 2/10 (Octomind) | QA Guardian |
| Unified multi-type testing | 10/10 | 3/10 | QA Guardian |
| Price competitiveness | Unknown | Varies | Cannot assess |

**Bottom line**: QA Guardian is building something genuinely differentiated (unified multi-type testing + MCP-native AI), but it is not a Shopify QA testing product. Trying to force it into the Shopify market would mean competing against cheaper, simpler, Shopify-native tools while carrying the overhead of features that Shopify merchants do not need. The better play is to own the "AI-native unified test management platform" category and let the Shopify-specific tools serve that niche.

**Sources:**
- [Uptime - Shopify App Store](https://apps.shopify.com/uptime)
- [TestCart - Shopify App Store](https://apps.shopify.com/test-cart)
- [Virtuoso QA - Shopify Plus Testing Guide](https://www.virtuosoqa.com/post/shopify-plus-testing)
- [Virtuoso QA - Automated Testing for Shopify Stores](https://www.virtuosoqa.com/post/automated-testing-for-shopify-stores)
- [testRigor - Shopify Testing](https://testrigor.com/shopify-testing/)
- [Octomind Pricing](https://octomind.dev/pricing)
- [Octomind - Product Hunt](https://www.producthunt.com/posts/octomind-qa-agent)
- [QA Wolf Pricing](https://www.g2.com/products/qa-wolf/pricing)
- [QA Wolf Reviews](https://www.g2.com/products/qa-wolf/reviews)
- [QA.tech Pricing](https://qa.tech/pricing)
- [Shopify Ecommerce Testing Guide 2026](https://www.shopify.com/blog/ecommerce-testing)

---

## Part 4: Solo Entrepreneur Feasibility (Solo Dev Agent - Barry)

### VERDICT: NOT READY. HIGH RISK. 12-16 weeks minimum before a demo.

### Codebase Complexity
- 293K LOC, 690 files, 14 systems to maintain
- Backend: 364 TS files (163K LOC), Frontend: 326 TSX files (130K LOC)
- 22 production + 12 dev backend deps, 18 production + 12 dev frontend deps
- 432 commits in ~11 days, 159 commits in single day - AI-generated code
- ZERO test files (.test.ts/.spec.ts) in entire codebase
- CI/CD uses `|| echo "non-blocking"` - builds never fail

### Shopify Integration: NONE
- Word "Shopify" appears exactly twice (both comments)
- Zero Shopify API integration, auth handling, theme awareness, checkout support
- Building Shopify support: 8-12 weeks estimated

### Operational Overhead: 10-15 hours/week minimum
- Docker monitoring: 2-3 hrs, DB backups: 1-2 hrs, Dependency updates: 2-3 hrs
- AI provider issues: 1-2 hrs, VPS maintenance: 1-2 hrs, Bug fixes: 3-5 hrs
- No automated alerting, no automatic recovery, no runbooks, no status page

### Revenue Analysis
- Realistic price: $200-400/month per store = $1-2K/month for 5 stores
- Costs: VPS $40-80, AI APIs $50-200, domain $2
- Effective rate: $11-28/hour factoring maintenance time

### Risk Assessment
- Bus factor: 1 (critical)
- Memory: Playwright + API in 2GB container WILL OOM with 5 concurrent stores
- No one else can SSH, read 293K LOC, or understand the Docker architecture
- New developer onboarding: 4-6 weeks

### Recommendation
Do NOT promise to partners yet. Pick ONE Shopify store as design partner, build integration for their store, prove stability for 3 months, then expand.

---

## Strategic Recommendations

### Path A: Pivot Away from Shopify (Recommended by Analyst)

Position QA Guardian as an **"AI-native unified test management platform"** for engineering teams. Target:
- Software engineering teams building complex web apps
- AI-forward development shops using Claude/MCP
- DevOps teams wanting one dashboard for all test types
- Price at $99-499/month per team

**Pros**: Plays to genuine strengths (breadth, MCP, unified platform). No Shopify integration needed.
**Cons**: Crowded market. Must still fix production hardening issues. Longer sales cycle.
**Timeline**: 8-12 weeks to production-ready MVP.

### Path B: Shopify Plus Enterprise Niche (Hybrid Play)

Target only Shopify Plus stores ($2,000+/month plans) with engineering teams. Compete against Virtuoso QA on:
- Unified platform (E2E + visual + load + security + accessibility)
- MCP/AI agent integration
- Price undercut

**Pros**: Higher-value customers who can use a developer tool. Less competition than general Shopify market.
**Cons**: Requires 6-12 months of Shopify-specific development. Small addressable market.
**Timeline**: 6-9 months for Shopify integration + production hardening.

### Path C: Design Partner Approach (Recommended by Solo Dev)

Pick ONE Shopify store as a design partner. Build specifically for their needs. Prove stability for 3 months. Then expand.

**Pros**: Lowest risk. Focused scope. Real validation before scaling.
**Cons**: Slowest path to revenue. Still requires production hardening.
**Timeline**: 3-4 months for first stable deployment.

---

## Production-Hardening Features (Priority Order)

These are the 21 highest-priority features identified across all four assessments that must be implemented before accepting paying customers:

| # | Feature | Priority | Category | Rationale |
|---|---------|----------|----------|-----------|
| 1 | Remove JWT default secret; fail startup if `JWT_SECRET` not set | P0-Critical | Security | Anyone can forge auth tokens |
| 2 | Add Redis password in docker-compose | P0-Critical | Security | Exposed without authentication |
| 3 | Automated daily `pg_dump` backups to offsite storage | P0-Critical | Operations | Single disk failure = total data loss |
| 4 | Add `process.on('unhandledRejection')` handler | P0-Critical | Stability | Unhandled rejection crashes Node process |
| 5 | Add BullMQ execution queue with concurrency limits | P0-Critical | Scalability | Concurrent browsers will OOM |
| 6 | Separate test execution into worker container | P1-High | Architecture | Chromium OOM kills API for all users |
| 7 | Wire `node-pg-migrate` for real database migrations | P1-High | Database | Schema changes silently ignored |
| 8 | Compile TypeScript for production (`tsc` build) | P1-High | Performance | tsx in production wastes memory |
| 9 | Add uptime monitoring with alerting (UptimeRobot) | P1-High | Operations | Nobody knows when system is down |
| 10 | Add smoke tests that block CI/CD deployment | P1-High | Quality | Broken code goes straight to production |
| 11 | Set Redis maxmemory policy | P1-High | Stability | Redis can fill up and crash |
| 12 | Add data retention/cleanup cron jobs | P1-High | Operations | Disk fills up within months |
| 13 | Add Content-Security-Policy headers | P2-Medium | Security | XSS protection |
| 14 | Add structured logging (replace console.log) | P2-Medium | Operations | Cannot diagnose production issues |
| 15 | Add error tracking (Sentry or similar) | P2-Medium | Operations | Errors silently lost |
| 16 | Harden CORS for production (remove dev wildcard) | P2-Medium | Security | Cross-origin attacks possible |
| 17 | Add route-level code splitting (React lazy) | P2-Medium | Performance | 75+ pages in single bundle |
| 18 | Remove hardcoded Postgres password from docker-compose | P2-Medium | Security | Credentials in version control |
| 19 | Add rate limiting on AI API calls | P2-Medium | Cost | Malicious user can burn AI budget |
| 20 | Add multi-tenant resource isolation | P3-Low | Scalability | One store's tests can starve others |
| 21 | Add reverse proxy (Caddy/Nginx) with HTTPS | P3-Low | Security | Backend serves HTTP only |

---

## Conclusion

QA Guardian has an **exceptionally strong technical foundation** -- the unified test execution engine (Playwright + K6 + Lighthouse + axe-core + ZAP) and MCP-native AI integration (170+ tools) are genuinely differentiated capabilities that no single competitor matches. The 5.7/10 score reflects not a lack of ambition or capability, but a gap between "impressive prototype" and "production-ready SaaS."

The path to production readiness requires 8-16 weeks of focused work on the 21 hardening features above, with the top 5 (JWT secret, Redis password, backups, unhandled rejection handler, execution queue) being non-negotiable before accepting any payment.

The Shopify-specific play is a poor fit for the platform's strengths. The recommended path is to position as an AI-native unified test management platform for engineering teams, or to start with a single design partner to prove stability before scaling.
