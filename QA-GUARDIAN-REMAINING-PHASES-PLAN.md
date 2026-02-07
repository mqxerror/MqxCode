# QA Guardian - Remaining Phases Creative Plan
## BMAD Party Team Approved | 2026-02-06

**Current State:** 260 features (250 passing, 10 pending for Phase 9/10)
**Remaining After Phase 9/10:** 4 phases, ~68 features
**Agreed Cuts:** AI Healing ML (15), Advanced MCP Tools (13), Services Dashboard (5), Caching (5) = 38 features CUT

---

## The Vision: From "Feature Complete" to "Ship Ready"

After Phase 9/10, QA Guardian will have clean code architecture and a polished navigation. The remaining 4 phases transform it from a **feature-complete prototype** into a **commercially viable product**:

| Phase | Theme | Features | Sessions | Impact |
|-------|-------|----------|----------|--------|
| **8R** | AI Settings UI | 5 | 1 | Users can configure AI providers without env vars |
| **4R** | Security Arsenal | 12 | 2-3 | Enterprise customers get dependency + secret scanning |
| **7** | Webhook Engine | 15 | 2-3 | Third-party integrations via n8n/Zapier/Make |
| **3R** | AI Test Generation | 18 | 3-4 | Flagship AI feature -- NL to Playwright tests |
| | **TOTAL** | **50** | **8-11** | |

---

## Phase 8R: AI Settings UI (5 features)

**Theme:** Let users configure AI without SSH-ing into the server

The AI router, Kie.ai integration, and Anthropic fallback are all built. But configuration requires editing environment variables. These 5 features add a proper settings UI.

| # | Feature | Description |
|---|---------|-------------|
| 1 | AI Provider Configuration Page | Settings page showing current provider (Kie.ai/Anthropic), status, latency, error rate. Toggle between providers. |
| 2 | AI API Key Management UI | Encrypted key storage. Mask display (sk-ant-****). Rotation with zero-downtime swap. Test connection button. |
| 3 | Model Selection UI per Feature | Dropdown to assign models per category (RCA -> Opus, Chat -> Haiku, Test Gen -> Sonnet). Cost estimate per choice. |
| 4 | Fallback Rules Configuration UI | Configure fallback triggers (timeout, 429, 5xx), retry count, backoff. Visual flow diagram. |
| 5 | AI Cost Budget Settings UI | Set monthly budget ($), soft/hard cap alerts, usage chart with burn rate projection. |

**BMAD Note (Winston):** These 5 features are the highest-ROI remaining work. Users currently need Docker exec to change AI providers. This is a deployment blocker for non-technical admins.

---

## Phase 4R: Security Arsenal (12 features)

**Theme:** Enterprise-grade dependency scanning and secret detection

Grouped into 3 batches for agent efficiency:

### Batch 1: Advanced Dependency Scanning (6 features)
| # | Feature | Description |
|---|---------|-------------|
| 1 | License compliance checking | Scan dependencies for GPL/AGPL/proprietary licenses. Flag violations. Policy rules. |
| 2 | SBOM generation (CycloneDX/SPDX) | Generate Software Bill of Materials from project dependencies. Export JSON/XML. |
| 3 | Container image scanning | Scan Docker images for OS-level vulnerabilities using Trivy. Results in security dashboard. |
| 4 | Upgrade recommendations | For each vulnerable package, suggest the minimum safe upgrade version. Show breaking change risk. |
| 5 | Dependency tree visualization | Interactive tree/graph showing dependency hierarchy, vulnerable paths highlighted. |
| 6 | Dependency scan on PR trigger | Auto-run dependency scan when GitHub PR is opened. Post results as PR comment/check. |

### Batch 2: Dependency Intelligence (4 features)
| # | Feature | Description |
|---|---------|-------------|
| 7 | Multi-language support | Extend scanning beyond npm to pip (Python), maven (Java), go.mod (Go), Cargo.toml (Rust). |
| 8 | Exploitability analysis with EPSS | Integrate EPSS (Exploit Prediction Scoring System) scores. Prioritize truly exploitable vulns. |
| 9 | Dependency health score | Composite score: age, maintenance activity, known vulns, license risk, download trends. |
| 10 | Dependency policy enforcement | Org-level rules: block specific packages, require minimum versions, enforce license allowlist. |

### Batch 3: Secret Detection Enhancement (2 features)
| # | Feature | Description |
|---|---------|-------------|
| 11 | Enhanced Gitleaks scanning with custom rules | Add custom regex patterns for org-specific secrets. Scan history. Baseline management. |
| 12 | Secret detection in CI pipeline | Auto-scan on every push. Block merges with exposed secrets. GitHub status check integration. |

**BMAD Note (Murat):** License compliance and SBOM are table-stakes for enterprise sales. EPSS scores differentiate from basic scanners. The dependency tree viz is a "wow factor" feature for demos.

---

## Phase 7: Webhook Engine (15 features)

**Theme:** Enable any integration without writing custom code

Grouped into 3 batches:

### Batch 1: Webhook Foundation (5 features)
| # | Feature | Description |
|---|---------|-------------|
| 1 | Webhook subscription CRUD API | Create/read/update/delete webhook endpoints. URL, events, secret, active flag. |
| 2 | Webhook event dispatcher | Fire webhooks on 12 event types (test.run.*, visual.diff.*, security.*, etc.). Async queue. |
| 3 | HMAC-SHA256 signature verification | Sign every payload with subscriber's secret. Include X-QG-Signature header. Verify docs. |
| 4 | Webhook retry with exponential backoff | Retry failed deliveries (3 attempts: 1min, 5min, 30min). Dead letter after max retries. |
| 5 | Webhook delivery logs | Log every delivery attempt: status code, response time, payload size, retry count. |

### Batch 2: Webhook Intelligence (5 features)
| # | Feature | Description |
|---|---------|-------------|
| 6 | Webhook payload customization | Template engine for custom payloads. Variables: {{test.name}}, {{run.status}}, etc. |
| 7 | Webhook filtering | Subscribe to specific events, projects, or statuses. Filter rules with AND/OR logic. |
| 8 | Webhook testing endpoint | "Send test event" button. Generates a sample payload and delivers to the configured URL. |
| 9 | Webhook status dashboard | Delivery success rate, average latency, failure breakdown. Per-subscriber health. |
| 10 | Webhook batch events | Group rapid-fire events into batches (e.g., 50 test results in one webhook instead of 50 webhooks). |

### Batch 3: Webhook UI (5 features)
| # | Feature | Description |
|---|---------|-------------|
| 11 | Webhook configuration page | Full CRUD UI for webhook subscriptions. Event picker, URL input, secret generation. |
| 12 | Webhook delivery log viewer | Paginated log with filters (status, event type, date). Click to see full payload + response. |
| 13 | Webhook payload preview | Live preview of what the webhook payload will look like for each event type. |
| 14 | n8n/Zapier integration guides | In-app guide pages with step-by-step setup for n8n, Zapier, and Make. Copy-paste webhook URLs. |
| 15 | Webhook health alerts | Alert when a webhook endpoint has >50% failure rate over 1 hour. Auto-disable after 24h of failures. |

**BMAD Note (Code Review Lead):** The webhook system replaces Phase 6 (External Integrations) entirely. 15 features is leaner than the original 38-feature spec estimate -- we consolidated overlapping features and removed the configuration UI duplication (it's now in the Settings section from Phase 9).

---

## Phase 3R: AI Test Generation (18 features)

**Theme:** The flagship AI differentiator -- describe tests in English, get Playwright code

This is the most complex remaining phase. Grouped into 4 batches:

### Batch 1: Core Generation Engine (5 features)
| # | Feature | Description |
|---|---------|-------------|
| 1 | NL-to-Playwright test generation | User describes test in plain English. Claude generates complete Playwright test code. |
| 2 | Multi-step test generation | Handle complex scenarios: "Login, add item to cart, checkout, verify confirmation email" |
| 3 | AI selector optimization | Claude analyzes target page DOM and suggests the most resilient selectors (data-testid > ARIA > CSS). |
| 4 | Assertion generation from outcomes | "Verify the price is $29.99" -> expect(page.locator('.price')).toHaveText('$29.99') |
| 5 | Ambiguity handling | When description is unclear, AI asks clarifying questions before generating. Confidence scoring. |

### Batch 2: Review & Iteration Workflow (5 features)
| # | Feature | Description |
|---|---------|-------------|
| 6 | Test preview before saving | Side-by-side view: English description on left, generated Playwright code on right. |
| 7 | Inline code editing | Monaco editor for tweaking generated code. Syntax highlighting + autocompletion. |
| 8 | Regenerate with feedback | "Make it check for mobile viewport too" -> AI adjusts the test. Diff view shows changes. |
| 9 | AI confidence scoring | 0-100 confidence badge on each generated test. Low confidence = needs human review. |
| 10 | Batch review queue | Queue of AI-generated tests awaiting human approval. Approve/reject/edit workflow. |

### Batch 3: Advanced Generation (5 features)
| # | Feature | Description |
|---|---------|-------------|
| 11 | Generate test suite from user story | Paste a Jira/Linear user story -> generate complete test suite covering all acceptance criteria. |
| 12 | BDD/Gherkin to Playwright conversion | Paste Given/When/Then scenarios -> generate matching Playwright test code. |
| 13 | Coverage gap identification | AI analyzes existing tests and suggests what's NOT tested. Prioritized by risk. |
| 14 | Test variation suggestions | For existing test, suggest edge cases: empty input, special chars, max length, timeout. |
| 15 | API test generation from OpenAPI spec | Upload OpenAPI/Swagger spec -> generate API tests for each endpoint. |

### Batch 4: Generation UI (3 features)
| # | Feature | Description |
|---|---------|-------------|
| 16 | AI test generation wizard | Step-by-step wizard: describe -> configure (browser, viewport) -> generate -> review -> save. |
| 17 | Screenshot-to-test generation | Upload screenshot, AI identifies elements and generates interaction tests. Claude Vision. |
| 18 | Code diff view for regenerations | When regenerating, show a unified diff of what changed. Accept/reject individual hunks. |

**BMAD Note (Winston):** This is the phase that sells the product. "Describe your test in English, get Playwright code" is the #1 demo moment. Features 1-5 are MVP. Features 6-10 make it production-ready. Features 11-18 are differentiators.

---

## BMAD Party Team Feedback

### Murat (TEA)

> **I approve this plan.** The feature count reduction from the original ~168 to 50 is smart. Each feature is scoped tightly enough for the agent to complete in 1-2 agent turns. The batching strategy (3-4 features per agent session) aligns with the agent's ~15 features/session throughput.
>
> **One concern:** Phase 3R (AI Test Generation) depends on the AI router being configurable (Phase 8R). If a user hasn't set up Kie.ai or Anthropic keys, test generation will fail silently. **Recommendation:** Phase 8R must complete before Phase 3R starts. This is already the planned order, but it should be enforced as a hard dependency.
>
> **NFR note:** Webhook retry queue (Phase 7, Feature 4) needs a BullMQ integration. The project already uses BullMQ for test execution -- reuse the same Redis connection. Don't create a separate queue system.

### Winston (Architect)

> **Strong approval.** The creative grouping into 4 phases with clear themes makes each phase independently shippable:
>
> - After Phase 8R: "AI configuration is self-service" (admin demo)
> - After Phase 4R: "Enterprise security scanning" (security team demo)
> - After Phase 7: "Integrate with anything" (integration demo)
> - After Phase 3R: "Describe tests in English" (flagship demo)
>
> **Architecture callouts:**
>
> 1. **Webhook batch events (Phase 7, #10):** Use a debounce pattern with 5-second window. Collect events, then fire one webhook with array payload. This is critical for test runs that produce 100+ results.
>
> 2. **SBOM generation (Phase 4R, #2):** Use the CycloneDX npm library, not a custom implementation. It's battle-tested and produces valid SBOM JSON.
>
> 3. **AI test generation (Phase 3R):** The agent already has MCP handlers for `generate_test_from_description` in the codebase. Phase 3R should wire these existing handlers to proper UI + review workflow, not rebuild the AI logic.
>
> 4. **File size compliance:** With Phase 10 nearly complete, all new features must respect the 1500-line limit. If any new file would exceed it, split proactively.

### Code Review Lead

> **Approved with quality notes:**
>
> 1. **Phase 7 webhook signature:** Use `crypto.createHmac('sha256', secret).update(payload).digest('hex')` and include timestamp in the signed payload to prevent replay attacks. Follow the Stripe webhook signing pattern.
>
> 2. **Phase 4R license scanning:** Don't reinvent the wheel. Use `license-checker` npm package for local scanning and map results to SPDX identifiers.
>
> 3. **Phase 3R confidence scoring:** Don't use arbitrary numbers. Base confidence on: (a) selector specificity, (b) assertion completeness, (c) step count vs description complexity, (d) known patterns vs novel generation.
>
> 4. **Total feature count sanity check:**
>    - Currently in DB: 260 features (250 passing, 10 pending)
>    - This plan adds: 50 features (#262-#311)
>    - New total: 310 features
>    - After Phase 9/10 complete + these 50: target 310/310 passing
>    - That represents the **production-ready milestone**

---

## Execution Timeline

| Order | Phase | Features | IDs | Est. Sessions |
|-------|-------|----------|-----|---------------|
| **NOW** | Phase 10 fixes + Phase 9 | 10 | #252-261 | 2-3 |
| **1** | Phase 8R: AI Settings UI | 5 | #262-266 | 1 |
| **2** | Phase 4R: Security Arsenal | 12 | #267-278 | 2-3 |
| **3** | Phase 7: Webhook Engine | 15 | #279-293 | 2-3 |
| **4** | Phase 3R: AI Test Generation | 18 | #294-311 | 3-4 |
| | **TOTAL** | **50** | | **8-11 sessions** |

**Total features at completion: 310 (260 existing + 50 new)**

---

## What's CUT (Agreed)

| Phase | Cut Features | Count | Reason |
|-------|-------------|-------|--------|
| Phase 3 | AI Healing ML Core | 15 | Rule-based healing works fine for SMB |
| Phase 5 | 13 Advanced MCP Tools | 13 | 170+ tools exist, diminishing returns |
| Phase 8 | Prompt/Response Caching | 5 | Premature optimization at current scale |
| Phase 11 | Services Dashboard | 5 | Operators can use Docker CLI |
| | **TOTAL CUT** | **38** | |

---

*Approved by BMAD Party Team*
*Murat (TEA): APPROVED | Winston (Architect): STRONG APPROVAL | Code Review Lead: APPROVED*
*Plan date: 2026-02-06*
