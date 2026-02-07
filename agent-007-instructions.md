# Agent 007 Instructions

## Folder Locations (IMPORTANT - Read First)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MqxCode Harness (The Tool)                                                  │
│ /Users/mqxerrormac16/Documents/LangarAI/MqxCode                             │
│                                                                             │
│ QA-Dam3oun / QA Guardian (The Project Being Managed)                        │
│ /Users/mqxerrormac16/Documents/QA-Dam3oun                                   │
│                                                                             │
│ Features Database (WHERE ALL FEATURES ARE STORED)                           │
│ /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db                       │
│                                                                             │
│ Production Server                                                           │
│ 38.111.111.206 → /opt/qa-guardian/                                          │
│                                                                             │
│ Production URL                                                              │
│ https://qa.pixelcraftedmedia.com                                            │
│                                                                             │
│ GitHub Repository                                                           │
│ https://github.com/mqxerror/qa-guardian                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Role

You (Claude Code / Agent 007) manage **two systems** and **two applications**:

### Systems Managed
1. **MqxCode Harness** (`/Users/mqxerrormac16/Documents/LangarAI/MqxCode`) — The autonomous coding agent framework that drives feature implementation via MCP tools
2. **QA Guardian App** (`/Users/mqxerrormac16/Documents/QA-Dam3oun`) — The QA testing platform being built and deployed

### Environments Managed
- **Local Development** — macOS, runs via `npm run dev` / `python start.py`
- **Production Server** — `38.111.111.206` (SSH root, password: `5ty6%TY^5ty6`), runs via Docker Compose at `/opt/qa-guardian/`
- **GitHub** — `https://github.com/mqxerror/qa-guardian` (main branch)

---

## Golden Rule: Single Source of Truth

**Every code change MUST go through the harness tracking system.** No exceptions.

### When the autonomous agent makes changes:
- It uses MCP tools (`feature_get_next`, `feature_mark_in_progress`, `feature_mark_passing`)
- Progress is tracked in `features.db` and `claude-progress.txt`
- Agent commits with descriptive messages

### When YOU (Agent 007) make manual changes:
1. **Register the fix as a feature** in `features.db` (next available ID after `SELECT MAX(id)`)
2. **Include evidence** in `verification_evidence` column (what was verified, commit hash)
3. **Update `claude-progress.txt`** with a session entry matching the agent's format
4. **Update `prompts/app_spec.txt`** if the change affects phases or capabilities
5. **Commit** with descriptive message + `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

### Feature registration SQL template:
```sql
INSERT INTO features (id, priority, category, name, description, steps, passes, in_progress, verification_evidence, marked_passing_at)
VALUES (NEXT_ID, PRIORITY, 'Category', 'Feature name', 'Description', '["step1","step2"]', 1, 0, 'Evidence string min 50 chars with commit hash', 'ISO_TIMESTAMP');
```

### Progress file format:
```
=== Manual Hotfix Session YYYY-MM-DD (Features #XXXX-#YYYY) ===
Progress: X/Y (Z%) - description

### Features Completed
**#XXXX: Feature name** (Priority Bug Fix/Enhancement)
- Problem: ...
- Fix: ...
- Commit: hash
```

---

## Deployment Workflow

```
1. Make code changes locally
2. Register as tracked features in features.db
3. Update claude-progress.txt
4. git add + commit + push to GitHub (main branch)
5. SSH to production: git pull + docker compose build + docker compose up -d
6. Verify: docker logs, health check, test
```

### Quick deploy commands:
```bash
# Pull, rebuild, restart backend only
sshpass -p '5ty6%TY^5ty6' ssh -o StrictHostKeyChecking=no root@38.111.111.206 \
  "cd /opt/qa-guardian && git pull origin main && docker compose build backend && docker compose up -d backend"

# Both backend + frontend
sshpass -p '5ty6%TY^5ty6' ssh -o StrictHostKeyChecking=no root@38.111.111.206 \
  "cd /opt/qa-guardian && git pull origin main && docker compose build backend frontend && docker compose up -d backend frontend"

# Check logs
sshpass -p '5ty6%TY^5ty6' ssh -o StrictHostKeyChecking=no root@38.111.111.206 \
  "docker logs qa-guardian-backend --tail 20"
```

---

## Harness Verification System (7 Layers)

The harness prevents the autonomous agent from falsely marking features as passing:

1. **Rate limiting** — Max 3 features per 5 minutes
2. **Evidence requirement** — Minimum 50 characters describing specific verification
3. **State machine** — Feature must be `in_progress` before marking `passing`
4. **Verification command** — Optional shell command that must exit 0
5. **Auto-backup** — Database backed up before each status change
6. **Audit log** — `StatusChangeLog` table records all changes with timestamps
7. **Prompt enforcement** — Templates instruct agent to provide evidence

Key files:
- `mcp_server/feature_mcp.py` — MCP server with `feature_mark_passing` enforcement
- `api/database.py` — SQLAlchemy models (Feature, StatusChangeLog)
- `.claude/templates/coding_prompt.template.md` — Agent instructions
- `.claude/templates/coding_prompt_yolo.template.md` — YOLO mode (lint only, no browser testing)

---

## QA Guardian Architecture

### Current Spec Status (from app_spec.txt)
- **Phase 1: Foundation** — Completed
- **Phase 2: Advanced Testing** — Completed
- **Phase 3: AI-Powered Intelligence** — Mostly completed (AI test generation pending)
- **Phase 4: Enterprise Security** — Partial (~60%)
  - DAST (ZAP): Completed (simulated)
  - Dependency Scanning: Partial (17 features pending)
  - **Secret Detection (Gitleaks): Pending** — Backend code exists, binary not in Dockerfile
  - SBOM Generation: Pending
- **Phase 5: Advanced AI & Testing** — Mostly completed
- **Phase 6: External Integrations** — Removed (use webhooks)
- **Phase 7: Webhooks** — Completed
- **Phase 8: AI Provider Infrastructure** — Mostly completed
- **Phase 9: Navigation Redesign** — Pending
- **Phase 10: Code Refactoring** — Pending
- **Phase 11: Platform Services Dashboard** — Pending (features #2127-2131)

### Database & Credentials
- **PostgreSQL**: `postgresql://qa_guardian:QaGuardian2024Secure@localhost:5432/qa_guardian` (inside Docker network)
- **Demo accounts**: owner/admin/developer/viewer @example.com (passwords: Owner123!, Admin123!, etc.)
- **Owner account**: `mqx.dev@gmail.com` / `5ty6%TY^5ty6`

### Tech Stack
- **Backend**: Node.js + TypeScript + Fastify + tsx (no build step, runs TS directly)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI
- **Database**: PostgreSQL 15 (Docker volume `postgres_data`)
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Testing**: Playwright (E2E), k6 (load), Lighthouse (performance)
- **AI**: Kie.ai (primary, 70% savings) + Anthropic Claude (fallback)

---

## Code Refactoring Notes (Phase 10)

### Problem: TypeScript without build step
The backend currently runs TypeScript directly via `tsx` (TypeScript Execute). This means:
- No compilation to JavaScript
- No type checking at build time in CI
- Cannot run in standard Node.js without tsx
- Harder to deploy to environments without tsx

### Planned Refactoring Strategy
1. **Add `tsc` build step** to produce JavaScript output in `dist/`
2. **Update Dockerfile** to run `npm run build` then `node dist/index.js` instead of `npx tsx src/index.ts`
3. **Add GitHub Actions CI pipeline** with:
   - `npm ci` — install dependencies
   - `npm run lint` — ESLint
   - `npx tsc --noEmit` — type check
   - `npm run build` — compile to JS
   - `npm test` — run any unit tests
4. **Benefit**: Catch TypeScript errors before deployment, not at runtime

### Oversized files to split (Phase 10):
| File | Lines | Split Into |
|------|-------|-----------|
| `test-runs.ts` | 26,697 | 6 modules |
| `monitoring.ts` | 10,291 | 5 modules |
| `github.ts` | 8,181 | 4 modules |
| `sast.ts` | 5,771 | 4 modules (scanning, vulnerabilities, secrets, reports) |

### GitHub Actions workflow (to be created):
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd backend && npm ci
      - run: cd backend && npx tsc --noEmit
      - run: cd backend && npm run lint
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

---

## Recent Bug Fixes (for context)

| Feature ID | Fix | Commit |
|-----------|-----|--------|
| #2123 | token_hash VARCHAR(255) → TEXT for JWT tokens | 9e5c510 |
| #2124 | k6 checks object→array parsing | 01d3f2b |
| #2125 | Null-safe .toFixed() on lighthouse metrics | 503489c |
| #2126 | Persist test runs to PostgreSQL | 503489c |

## Pending Work

- **Gitleaks installation**: Add to backend Dockerfile, deploy, verify on services page (Phase 4)
- **Services Dashboard features #2127-2131**: Agent building, some already done
- **Phase 9**: Navigation redesign (38-item sidebar → ~12 with collapsible groups)
- **Phase 10**: Code refactoring + GitHub Actions CI
- **Phase 4 remaining**: 17 dependency scanning features, SBOM generation

---

## Sub-Agent Usage Policy

The user prefers sub-agents for tasks to keep context low:
- **Explore agent**: For codebase investigation and searching
- **Coder agent**: For implementing fixes across multiple files
- **Deep-dive agent**: For thorough analysis before critical changes
- **Code-review agent**: For verifying code quality
- **webapp-testing skill**: For Playwright-based UI verification

Always use sub-agents for tasks touching 3+ files or requiring extensive search.

---

## CRITICAL: Managing QA-Dam3oun from MqxCode

### Understanding the Relationship

```
MqxCode (Harness Tool)              QA-Dam3oun (Managed Project)
/Documents/LangarAI/MqxCode/   -->  /Documents/QA-Dam3oun/
├── agent-007-instructions.md       ├── features.db  ← THE ACTUAL DATABASE
├── api/database.py (schema)        ├── backend/
├── mcp_server/ (MCP tools)         ├── frontend/
└── features.db (EMPTY, ignore)     └── docker-compose.yml
```

**IMPORTANT**: The `features.db` in MqxCode folder is EMPTY and unused. All features are stored in **QA-Dam3oun/features.db**.

### Features Database Location

```bash
# CORRECT - QA-Dam3oun project database (this is where features live)
/Users/mqxerrormac16/Documents/QA-Dam3oun/features.db

# WRONG - MqxCode harness database (empty, do not use)
/Users/mqxerrormac16/Documents/LangarAI/MqxCode/features.db
```

### Database Schema (features table)

```sql
CREATE TABLE features (
    id INTEGER PRIMARY KEY,
    priority INTEGER NOT NULL DEFAULT 999,  -- Lower = higher priority
    category VARCHAR(100) NOT NULL,         -- e.g., "Performance/Backend"
    name VARCHAR(255) NOT NULL,             -- Short descriptive name
    description TEXT NOT NULL,              -- Detailed description
    steps JSON NOT NULL,                    -- Array of implementation steps
    passes BOOLEAN DEFAULT 0,               -- 1 = completed, 0 = pending
    in_progress BOOLEAN DEFAULT 0,          -- 1 = being worked on
    verification_command TEXT,              -- Optional shell command to verify
    verification_evidence TEXT,             -- Proof of completion (min 50 chars)
    marked_passing_at TEXT                  -- ISO timestamp when completed
);
```

### How to Add New Features

**Step 1: Check current max ID**
```bash
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db \
  "SELECT MAX(id) FROM features;"
```

**Step 2: Insert new features (starting from MAX_ID + 1)**
```sql
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db "
INSERT INTO features (id, priority, category, name, description, steps, passes, in_progress)
VALUES
(NEXT_ID, PRIORITY, 'Category/Subcategory', 'Feature name',
 'Detailed description of what needs to be done.',
 '[\"Step 1\",\"Step 2\",\"Step 3\",\"Test: verification step\"]',
 0, 0);
"
```

**Step 3: Verify features were added**
```bash
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db \
  "SELECT id, priority, name, passes FROM features WHERE id >= NEXT_ID ORDER BY id;"
```

### Check Feature Statistics

```bash
# Get counts
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db "
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN passes=1 THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN passes=0 AND in_progress=0 THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN in_progress=1 THEN 1 ELSE 0 END) as in_progress
FROM features;"

# List pending features by priority
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db "
SELECT id, priority, category, name FROM features
WHERE passes=0 ORDER BY priority, id LIMIT 20;"
```

### Priority Levels

| Priority | Meaning | When to Use |
|----------|---------|-------------|
| 1 | Critical | Blocking issues, security fixes, core functionality |
| 2 | High | Important features, performance improvements |
| 3 | Medium | Nice-to-have features, refactoring |
| 4 | Low | Enhancements, polish, future considerations |

### Category Naming Convention

Use `Area/Subcategory` format:
- `Performance/Backend` — Backend performance optimizations
- `Performance/Frontend` — Frontend performance optimizations
- `Performance/Database` — Database indexes, queries
- `Security/DAST` — Dynamic security scanning
- `Security/SAST` — Static security scanning
- `UI/Dashboard` — Dashboard improvements
- `API/Endpoints` — API route changes
- `Bug/Critical` — Critical bug fixes

---

## Production Deployment Issues & Fixes

### Common Issue: ZAP Container Blocking Backend

**Symptom**: Production shows "Bad Gateway", logs show:
```
Container qa-guardian-zap Error dependency zap failed to start
dependency failed to start: container qa-guardian-zap is unhealthy
```

**Cause**: Backend depends on ZAP container with `condition: service_healthy`, but ZAP health check fails.

**Fix**: Make ZAP optional in `docker-compose.yml`:
```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    # ZAP is optional - don't block backend startup
    # zap:
    #   condition: service_healthy
```

### Common Issue: Login Fails with "Not associated with organization"

**Symptom**: Users can't log in, error: "Your account is not associated with any organization"

**Cause**: `initTestUsers()` called at module load time before database connection established.

**Fix**: Call `initTestUsers()` AFTER `initializeDatabase()` in `backend/src/index.ts`:
```typescript
// In start() function, AFTER initializeDatabase():
try {
  await initTestUsers();
} catch (err: any) {
  console.error('[Startup] Failed to seed test users:', err.message);
}
```

### GitHub Actions Deployment Pipeline

The CI/CD is in `.github/workflows/deploy.yml`:
1. Push to `main` triggers build
2. Build & test job runs (frontend + backend)
3. Deploy job SSHs to production and runs:
   ```bash
   cd /opt/qa-guardian
   git pull origin main
   docker compose build backend frontend
   docker compose up -d --force-recreate backend frontend
   ```

### Verify Production Health

```bash
# Check if site is up
curl -sf https://qa.pixelcraftedmedia.com/api/v1/health

# Check backend logs on production
sshpass -p '5ty6%TY^5ty6' ssh root@38.111.111.206 \
  "docker logs qa-guardian-backend --tail 50"

# Check container status
sshpass -p '5ty6%TY^5ty6' ssh root@38.111.111.206 \
  "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

---

## Performance Optimization Context (Features #53-65)

### Problem Statement
Large projects with many tests experience slow loading:
- RunHistoryPage loads 1000 runs at once
- ProjectDetailPage makes 11+ sequential API calls
- React Query installed but unused (348 vanilla fetch calls)
- Redis installed but not used for caching
- Missing database indexes

### Solution Architecture

**Phase 1: Backend Pagination** (Features #53-55)
- Add `page`, `limit` query params to list endpoints
- Return paginated response: `{ data: [], pagination: { page, limit, total, hasNext } }`

**Phase 2: React Query Hooks** (Features #56-59)
- Create hooks in `frontend/src/hooks/api/`
- Replace vanilla fetch with `useQuery`/`useMutation`
- Enable automatic caching and deduplication

**Phase 3: Redis Caching** (Features #60-62)
- Create `backend/src/services/cache.ts`
- Cache frequently accessed data with TTLs
- Invalidate cache on mutations

**Phase 4: Advanced** (Features #63-65)
- Virtual scrolling for large lists
- Infinite scroll
- Optimistic updates

### Key Files for Performance Work

```
backend/
├── src/routes/test-runs/run-core-routes.ts  # Pagination for runs
├── src/routes/test-suites/routes.ts         # Pagination for tests
├── src/routes/projects/routes.ts            # Pagination for suites
├── src/services/cache.ts                    # Redis cache (create new)
└── src/services/database.ts                 # Add indexes

frontend/
├── src/hooks/api/useRuns.ts                 # React Query hooks (create new)
├── src/hooks/api/useProjects.ts
├── src/hooks/api/useSuites.ts
├── src/hooks/api/useTests.ts
├── src/pages/RunHistoryPage.tsx             # Migrate to React Query
├── src/pages/ProjectDetailPage.tsx          # Parallelize API calls
└── src/pages/TestSuitePage.tsx              # Migrate to React Query
```

---

## Quick Reference Commands

```bash
# Check QA-Dam3oun feature stats
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db \
  "SELECT COUNT(*) as total, SUM(passes) as done FROM features;"

# List pending features
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db \
  "SELECT id, name FROM features WHERE passes=0 ORDER BY priority, id;"

# Mark feature as passing (for manual fixes)
sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db "
UPDATE features SET
  passes=1,
  in_progress=0,
  verification_evidence='Manual fix: description here. Commit: HASH',
  marked_passing_at=datetime('now')
WHERE id=FEATURE_ID;"

# Production health check
curl -sf https://qa.pixelcraftedmedia.com/api/v1/health | jq

# Deploy to production (after pushing to GitHub)
sshpass -p '5ty6%TY^5ty6' ssh root@38.111.111.206 \
  "cd /opt/qa-guardian && git pull && docker compose build backend frontend && docker compose up -d"
```

---

## Session Recovery Checklist

When starting a new session or recovering from crash:

1. **Check current feature status**:
   ```bash
   sqlite3 /Users/mqxerrormac16/Documents/QA-Dam3oun/features.db \
     "SELECT COUNT(*) as total, SUM(passes) as done, SUM(in_progress) as wip FROM features;"
   ```

2. **Check production status**:
   ```bash
   curl -sf https://qa.pixelcraftedmedia.com/api/v1/health
   ```

3. **Check git status** in QA-Dam3oun:
   ```bash
   cd /Users/mqxerrormac16/Documents/QA-Dam3oun && git status
   ```

4. **Review MqxCode UI** at http://127.0.0.1:5173 (or wherever it's running)

5. **Read this file** for context on pending work and known issues
