# Agent 007 Instructions

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
