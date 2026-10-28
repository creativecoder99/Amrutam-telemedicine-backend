# Amrutam Telemedicine System — Master Implementation Plan (Redesigned)

| **Document Version** | 2.0.0 (Redesigned for Dual-Folder Frontend/Backend & Docker Architecture) |
| **Status**           | Approved for Engineering |
| **Architecture**     | **`frontend/`** (Next.js 15, Lato, Design Token System) + **`backend/`** (Node.js, PostgreSQL 16, Redis 7, BullMQ) |
| **Orchestration**    | Docker Compose multi-container stack (Frontend, Backend, PostgreSQL, Redis, Prometheus, Jaeger, Grafana) |
| **Target Scale**     | 100,000 daily consultations (p95 reads < 200ms, p95 writes < 500ms, 99.95% availability) |

---

## 1. Executive Architecture & Workspace Separation

The project is structured into two clean, self-contained root directories with containerized orchestration:

```
Amrutam teleMedicine System/
├── backend/                         # Production-grade Node.js Telemedicine Engine
│   ├── src/
│   │   ├── config/                  # DB pool, Redis, Logger, Prometheus metrics, OTEL
│   │   ├── core/                    # DI container, custom errors, domain Result types
│   │   ├── middlewares/             # Auth, RBAC, Idempotency, Rate-limit, Audit, Errors
│   │   ├── modules/                 # Modular domain modules (Controller-Service-Repo)
│   │   │   ├── auth/                # Login, Register, RFC 6238 TOTP MFA, JWT + Refresh
│   │   │   ├── doctors/             # Doctor profile, NMC verification, Search & discovery
│   │   │   ├── availability/        # Recurring rules, 30-day slot generator, buffer times
│   │   │   ├── bookings/            # Redlock distributed lock, 10-min hold, Saga orchestrator
│   │   │   ├── consultations/       # State machine, encrypted SOAP notes, video session
│   │   │   ├── prescriptions/       # Ayurvedic formulation engine, HMAC digital signature
│   │   │   ├── payments/            # Checkout, Mock Gateway adapter, Webhook processor
│   │   │   ├── audit/               # Immutable HMAC-SHA256 audit log chain (DISHA/HIPAA)
│   │   │   └── analytics/           # Admin KPIs, Doctor utilization, Financial aggregates
│   │   ├── jobs/                    # BullMQ async workers (PDF generation, notifications)
│   │   ├── database/                # Migrations (DDL, Partitioning, Indexes) & Seeds
│   │   ├── utils/                   # AES-256-GCM encryption, Full Jitter backoff, Circuit breaker
│   │   └── app.ts / server.ts       # Express/Fastify HTTP application & health checks
│   ├── tests/                       # Unit, integration, and concurrent race-condition tests
│   ├── Dockerfile                   # Multi-stage production container for Backend
│   ├── package.json                 # Backend dependencies (pg, ioredis, bullmq, zod, etc.)
│   └── tsconfig.json                # TypeScript strict configuration
│
├── frontend/                        # Next.js 15 Token-Driven Storefront & Telehealth Portal
│   ├── src/
│   │   ├── app/                     # Next.js 15 App Router pages & layouts
│   │   │   ├── layout.tsx           # Global root layout with Lato font & semantic tokens
│   │   │   ├── page.tsx             # Amrutam Telemedicine homepage (Authentic Ayurveda)
│   │   │   ├── doctors/             # Doctor discovery & multi-criteria search
│   │   │   ├── doctors/[id]/        # Doctor bio, Prakriti expertise, slot picker
│   │   │   ├── checkout/            # Idempotent slot booking & payment breakdown
│   │   │   ├── consultation/[id]/   # Live consultation waiting room, vitals & SOAP notes
│   │   │   ├── prescriptions/[id]/  # Verifiable Ayurvedic prescription viewer & PDF download
│   │   │   ├── patient/             # Patient health record portal & booking history
│   │   │   ├── admin/               # Operations dashboard & immutable audit log explorer
│   │   │   ├── terms/               # Terms of Service (DISHA/ABDM compliant draft)
│   │   │   └── privacy/             # Healthcare Privacy Policy & PHI disclosure rules
│   │   ├── components/              # Token-compliant UI components (WCAG 2.2 AA)
│   │   │   ├── layout/              # Header, Navigation, Footer (Amrutam styling)
│   │   │   ├── doctors/             # DoctorCard, FilterBar, RatingBadge
│   │   │   ├── booking/             # SlotPicker, HoldCountdownTimer, ReservationModal
│   │   │   ├── prescription/        # PrescriptionTable, VaidyaSignatureBadge, DosageRow
│   │   │   ├── ui/                  # Button, Input, Select, Badge, Card, Modal, Alert
│   │   │   └── accessibility/       # SkipToContent, FocusTrap, VisuallyHidden
│   │   ├── styles/
│   │   │   ├── tokens.css           # Exact Amrutam design tokens (colors, spacing, typography)
│   │   │   └── globals.css          # Base resets, Lato font rules, focus-visible styles
│   │   ├── lib/                     # API client, session management, token helpers
│   │   └── types/                   # Frontend TypeScript interfaces
│   ├── public/                      # Static assets & brand media
│   ├── Dockerfile                   # Multi-stage standalone production container for Frontend
│   ├── package.json                 # Next.js 15, React 19, TypeScript
│   └── tsconfig.json                # TypeScript strict configuration
│
├── docs/                            # Architectural & Engineering Specifications
│   ├── PRD.md                       # Product Requirements Document
│   ├── TRD.md                       # Technical Requirements Document
│   ├── IMPLEMENTATION_PLAN.md       # Master Execution Roadmap (This Document)
│   ├── design.md                    # Amrutam Design Tokens & Strict UI Rules
│   └── skills.md                    # Amrutam Design System Skill Specifications
│
├── infra/                           # Infrastructure as Code & Observability
│   ├── k8s/                         # Kubernetes manifests (Deployments, Services, HPA)
│   ├── terraform/                   # AWS Production IaC (RDS Multi-AZ, ElastiCache, ECS)
│   └── observability/               # Prometheus alerting rules & Grafana dashboards
│
├── docker-compose.yml               # Unified multi-service orchestrator
└── README.md                        # Master setup guide, API docs & operations runbook
```

---

## 2. Frontend Design Token System & UI Constraints

All frontend UI code in `frontend/` strictly conforms to `docs/design.md` and `docs/skills.md`:

### 2.1 Design Tokens (`frontend/src/styles/tokens.css`)
```css
:root {
  /* Typography */
  --font-family-primary: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-base: 18px;
  --font-weight-base: 500;
  --font-line-height-base: 27px;

  --font-size-xs: 12px;
  --font-size-sm: 13.5px;
  --font-size-md: 14px;
  --font-size-lg: 15px;
  --font-size-xl: 16px;
  --font-size-2xl: 18px;
  --font-size-3xl: 20px;
  --font-size-4xl: 21px;

  /* Color Palette */
  --color-text-primary: #213d31;   /* Deep Forest Herbal Green */
  --color-border-muted: #3a643b;   /* Earthy Moss Green */
  --color-border-strong: #222222;  /* Charcoal */
  --color-surface-base: #000000;   /* Deep Base / Contrast */
  --color-surface-muted: #f7fbf5;  /* Subtle Warm Herbal Tint */
  --color-surface-raised: #fffdf3; /* Warm Cream Surface */
  --color-surface-strong: #344334; /* Deep Olive Header Surface */

  /* Spacing Scale */
  --space-1: 5px;
  --space-2: 8px;
  --space-3: 9px;
  --space-4: 10px;
  --space-5: 11px;
  --space-6: 14px;
  --space-7: 15px;
  --space-8: 16px;

  /* Radius Tokens */
  --radius-xs: 18px;
  --radius-sm: 20px;
  --radius-md: 50px;
  --radius-lg: 999px;

  /* Shadow Tokens */
  --shadow-1: rgba(0, 0, 0, 0.12) 0px 10px 22px 0px;
  --shadow-2: rgba(0, 0, 0, 0.12) 0px 14px 32px 0px;

  /* Motion Tokens */
  --motion-duration-instant: 200ms;
  --motion-duration-fast: 220ms;
  --motion-duration-normal: 250ms;
  --motion-duration-slow: 300ms;
  --motion-duration-slower: 500ms;
}
```

### 2.2 Strict UI/UX Boundaries & Quality Gates
* **Backgrounds**: Body uses warm cream `--color-surface-raised` (`#fffdf3`) or herbal tint `--color-surface-muted` (`#f7fbf5`). **Pure white (`#ffffff`) is strictly prohibited as page background.**
* **Typography**: Clean, readable Lato font loaded via Google Fonts with complete weight set (400, 500, 700). Inter, Geist, Space Grotesk are banned.
* **Prohibited Visual Clutter**: Zero harsh gradients, rainbow colors, neon accents, generic pastels, purple-and-black themes, radial orbs, dot grids, liquid glass, decorative stripes, sparkle icons, emojis, or animated arrows.
* **Meaningful Interactions**: Every button, input, and modal provides distinct states: `default`, `hover`, `:focus-visible` (with high-contrast 2px outline), `active`, `disabled`, and `loading` (accessible spinner).
* **Copywriting**: Direct, honest healthcare copy without en-dashes/em-dashes. Verified practitioner credentials, genuine consultation steps, and real pricing disclosures.

---

## 3. Backend Architecture & PostgreSQL Data Engine

All backend code in `backend/` is built on Node.js (TypeScript) with PostgreSQL 16 and Redis 7:

### 3.1 PostgreSQL 16 Partitioning & Schema DDL
* **Partitioned `consultations`**: Monthly range partitions (`consultations_YYYY_MM`) on `scheduled_start_time` for sub-10ms pruning and rapid archiving.
* **Partitioned `availability_slots`**: Monthly range partitions (`availability_slots_YYYY_MM`) on `start_time`.
* **Partitioned `audit_logs`**: Quarterly range partitions (`audit_logs_YYYY_Qn`) on `created_at` with SHA-256 HMAC hash chaining.
* **Concurrency Guarantee**:
  * Distributed lock via Redis Redlock (`SET lock:slot:{id} {token} NX PX 10000`).
  * Row-level lock via PostgreSQL `SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`.
  * Status transition to `HELD` with `hold_expires_at = NOW() + INTERVAL '10 minutes'`.
  * Partial unique index `UNIQUE (doctor_id, start_time)` preventing double-insertion.

### 3.2 Security, Field Encryption & Compliance
* **MFA / TOTP**: RFC 6238 Time-based One-Time Password support for Doctor and Admin roles using `otplib`.
* **Field-Level Encryption (FLE)**: AES-256-GCM envelope encryption for sensitive patient health data (`encrypted_soap_notes`, `encrypted_diagnosis`, `medical_history_encrypted`) stored as `iv:authTag:ciphertext`.
* **Idempotency Engine**: Intercepts `Idempotency-Key` header with two-phase lock in Redis to prevent duplicate bookings or charges.
* **Tamper-Evident Audit Trail**: Every PHI read and write computes an HMAC-SHA256 signature chained to the previous record hash.

---

## 4. Multi-Container Docker Architecture

The entire ecosystem is orchestrated via `docker-compose.yml` for unified local development and production-grade staging:

```yaml
version: '3.8'

services:
  # 1. Frontend: Next.js 15 Standalone
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: amrutam_frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:4000/api
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - amrutam_network

  # 2. Backend: Node.js Telemedicine API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: amrutam_backend
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - NODE_ENV=production
      - DATABASE_URL=postgresql://amrutam_user:amrutam_secret@postgres:5432/amrutam_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=amrutam_super_secure_jwt_secret_key_2026
      - ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - amrutam_network

  # 3. Database: PostgreSQL 16
  postgres:
    image: postgres:16-alpine
    container_name: amrutam_postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=amrutam_user
      - POSTGRES_PASSWORD=amrutam_secret
      - POSTGRES_DB=amrutam_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U amrutam_user -d amrutam_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - amrutam_network

  # 4. Cache & Locks: Redis 7
  redis:
    image: redis:7-alpine
    container_name: amrutam_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - amrutam_network

  # 5. Metrics: Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: amrutam_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./infra/observability/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - amrutam_network

  # 6. Distributed Tracing: Jaeger
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: amrutam_jaeger
    ports:
      - "16686:16686"
      - "4318:4318" # OTLP HTTP receiver
    networks:
      - amrutam_network

  # 7. Dashboards: Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: amrutam_grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    networks:
      - amrutam_network

volumes:
  postgres_data:
  redis_data:

networks:
  amrutam_network:
    driver: bridge
```

---

## 5. Phased Implementation Roadmap & Execution Steps

### Phase 1: Directory Setup, Docker Scaffolding & Shared Infrastructure
* **Step 1.1**: Create `backend/` and `frontend/` directory trees.
* **Step 1.2**: Author root `docker-compose.yml`, `.env.example`, `.dockerignore`.
* **Step 1.3**: Configure `backend/Dockerfile` (multi-stage: deps, builder, runner, non-root user `nodejs`).
* **Step 1.4**: Configure `frontend/Dockerfile` (multi-stage: deps, builder, standalone runner).
* **Step 1.5**: Setup `infra/observability/prometheus.yml` to scrape `backend:4000/metrics`.

### Phase 2: Backend Foundations & PostgreSQL 16 Migrations
* **Step 2.1**: Initialize `backend/package.json` (`express`, `pg`, `ioredis`, `zod`, `pino`, `prom-client`, `bullmq`, `otplib`, `jsonwebtoken`, `bcryptjs`, `uuid`, `dotenv`, `helmet`, `cors`).
* **Step 2.2**: Configure `backend/tsconfig.json` with strict mode and path alias (`@/*`).
* **Step 2.3**: Build `backend/src/config/`: `env.ts` (Zod validation), `database.ts` (`pg.Pool` with connection retry), `redis.ts` (`ioredis`), `logger.ts` (Pino with `X-Correlation-ID`), `metrics.ts` (Prometheus RED counters/histograms).
* **Step 2.4**: Implement PostgreSQL migrations:
  - `001_initial_schema.sql`: `users`, `user_profiles`, `doctors`, `availability_slots`, `consultations`, `prescriptions`, `prescription_items`, `payments`, `audit_logs`, `idempotency_keys`.
  - `002_range_partitioning.sql`: Monthly partitioning for `consultations` and `availability_slots`; quarterly partitioning for `audit_logs`.
  - `003_indexes_and_constraints.sql`: Search indexes, slot uniqueness constraint, foreign keys.
  - `004_amrutam_seed_data.sql`: Authentic Ayurvedic doctors, Kayachikitsa/Panchakarma specialties, verified patient records, initial slot inventory.

### Phase 3: Backend Security, Concurrency & Core Domain Modules
* **Step 3.1**: Implement `backend/src/utils/crypto.ts` (AES-256-GCM encryption/decryption, HMAC generator).
* **Step 3.2**: Build Middlewares:
  - `auth.middleware.ts`: JWT verification with token expiry & payload decoding.
  - `rbac.middleware.ts`: Role-based access control (`PATIENT`, `DOCTOR`, `ADMIN`, `AUDITOR`).
  - `idempotency.middleware.ts`: Redis-backed 2-phase lock with `Idempotency-Key` header.
  - `rate-limit.middleware.ts`: Redis token-bucket sliding-window rate limiter.
  - `audit.middleware.ts`: Automatic interceptor writing to cryptographic audit chain.
* **Step 3.3**: Auth & IAM Module:
  - User registration with bcrypt hashing.
  - Login with 15-minute access token + 7-day rolling refresh token.
  - RFC 6238 TOTP MFA enrollment and verification.
* **Step 3.4**: Doctor Discovery & Availability Module:
  - Doctor search with specialty, rating, fee filters and Redis cache-aside (TTL: 180s).
  - Slot generator expanding recurring rules into discrete slots with 5-minute buffers.
* **Step 3.5**: Concurrency & Zero Double-Booking Module:
  - Redis Redlock distributed lock acquisition (`SET lock:slot:{id} {token} NX PX 10000`).
  - Safe Lua release script.
  - Row-level lock (`SELECT ... FOR UPDATE`) with 10-minute hold transition.
* **Step 3.6**: Booking & Payment Saga Orchestrator:
  - Checkout order creation.
  - Mock payment gateway adapter (`authorize`, `capture`, `refund`).
  - Idempotent payment webhook: marks slot `BOOKED`, creates consultation `SCHEDULED`.
  - Compensating transactions: auto-release expired holds; refund payments if subsequent steps fail.
* **Step 3.7**: Consultation & Digital Prescription Engine:
  - Consultation state transitions (`SCHEDULED` -> `WAITING_ROOM` -> `IN_PROGRESS` -> `COMPLETED`).
  - Encrypted SOAP notes (Subjective, Objective, Assessment, Plan).
  - Prescription line items with Ayurvedic dosage, formulation, frequency, and Anupana.
  - HMAC-SHA256 digital signature over canonical prescription payload.
  - Finalized immutability guard.
* **Step 3.8**: Background Workers (`backend/src/jobs/`):
  - BullMQ queue runner with fallback for notification dispatch and PDF compilation.
* **Step 3.9**: Health Checks & Telemetry:
  - `/health/live`, `/health/ready`, `/health/startup`, and `/metrics`.

### Phase 4: Frontend Token-Driven Next.js Storefront & Telehealth Portal
* **Step 4.1**: Initialize `frontend/package.json` (Next.js 15, React 19, TypeScript).
* **Step 4.2**: Configure `frontend/tsconfig.json` and `frontend/next.config.mjs` (standalone output for Docker).
* **Step 4.3**: Implement `frontend/src/styles/tokens.css` with exact Amrutam tokens:
  - Warm cream surface `#fffdf3`, muted `#f7fbf5`, forest green text `#213d31`, moss green border `#3a643b`.
  - Exact radius (`18px`, `20px`, `50px`, `999px`), shadows, and motion timings.
  - Strict prohibited list enforced: no pure white backgrounds, no radial orbs/glass, no rainbow colors.
* **Step 4.4**: Configure Lato Google Font in `frontend/src/app/layout.tsx`.
* **Step 4.5**: Build Accessible UI Atoms (`frontend/src/components/ui/`):
  - `Button.tsx` (primary, secondary, subtle variants with focus-visible and loading states).
  - `Input.tsx` (labeled inputs with aria-describedby error states).
  - `Badge.tsx` (status indicators for slots and consultations).
  - `Card.tsx` (clean token-driven cards without excessive shadows).
  - `Modal.tsx` (accessible dialog with focus trap and keyboard ESC listener).
* **Step 4.6**: Build Application Views:
  - **Homepage (`/`)**: Amrutam telehealth mission, authentic doctor discovery intro, quick category search.
  - **Doctor Discovery (`/doctors`)**: Filter bar (specialty, availability, fee, rating), doctor cards with verified NMC badges.
  - **Doctor Profile & Slot Picker (`/doctors/[id]`)**: Practitioner biography, Ayurvedic Prakriti expertise, interactive calendar slot selector with live availability status.
  - **Checkout Screen (`/checkout`)**: 10-minute hold countdown timer, fee breakdown, idempotent payment trigger.
  - **Consultation Room (`/consultation/[id]`)**: Waiting room status, vitals review, live consultation lifecycle control, encrypted SOAP notes editor for doctors.
  - **Prescription Viewer (`/prescriptions/[id]`)**: Authenticated prescription document with Vaidya digital signature badge, Ayurvedic formulation schedule, Anupana directions, and PDF download action.
  - **Patient Medical Portal (`/patient`)**: Historical consultations, active prescriptions, encrypted medical notes.
  - **Admin Analytics Dashboard (`/admin`)**: Real-time consultation volume, doctor utilization gauge, no-show rate, immutable audit log chain viewer.
  - **Compliance Pages (`/terms`, `/privacy`)**: Draft DISHA / ABDM health data practices and patient consent policies.

### Phase 5: Automated Testing, Concurrency Verification & CI Pipeline
* **Step 5.1**: Author Backend Unit Tests (`backend/tests/unit/`):
  - AES-256-GCM encryption/decryption round-trip.
  - HMAC audit log hash chain validation.
  - RFC 6238 TOTP verification.
  - Exponential backoff with Full Jitter distribution.
* **Step 5.2**: Author Backend Integration Tests (`backend/tests/integration/`):
  - End-to-end user authentication & MFA lifecycle.
  - Doctor search with Redis cache hits.
  - Idempotency key replay test (confirm duplicate request returns identical payload without re-charging).
  - Booking & payment webhook lifecycle.
* **Step 5.3**: Author Concurrency Race-Condition Test (`backend/tests/concurrency/double-booking.test.ts`):
  - Fires 10 concurrent HTTP requests against the exact same slot ID.
  - Verifies that exactly 1 request acquires the hold (`201 Created`), while the remaining 9 return `409 Conflict`.
* **Step 5.4**: Configure GitHub Actions CI (`.github/workflows/ci-cd.yml`):
  - Linting (`tsc --noEmit`).
  - Security audit (`npm audit`).
  - Automated tests with PostgreSQL & Redis service containers.
  - Docker build verification for both `frontend` and `backend`.

### Phase 6: Documentation, OpenAPI Schema & Verification Runbook
* **Step 6.1**: Author `docs/ARCHITECTURE.md` (3-page deep dive with Mermaid diagrams).
* **Step 6.2**: Author OpenAPI 3.1 specification (`backend/src/openapi/openapi.yaml`).
* **Step 6.3**: Author master `README.md` with one-command Docker startup (`docker compose up --build`), local development instructions, test instructions, and API endpoints table.

---

## 6. Deliverables Checklist & Acceptance Criteria

| Deliverable | Location | Acceptance Criteria |
| :--- | :--- | :--- |
| **Backend Code** | `backend/src/` | Modular Node.js (TypeScript) services with DI, Redis Redlock, AES-256-GCM field encryption, BullMQ queues, Pino logging. |
| **Frontend Code** | `frontend/src/` | Next.js 15 App Router, Lato font, warm cream `#fffdf3` background, WCAG 2.2 AA keyboard-first, zero prohibited visual gimmicks. |
| **PostgreSQL Schema** | `backend/src/database/migrations/` | Declarative range partitioning (`consultations`, `availability_slots`, `audit_logs`), row-level locks, indexes, seed data. |
| **Docker Stack** | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | Single command `docker compose up --build` spins up all 7 services healthy. |
| **Concurrency Test** | `backend/tests/concurrency/` | Proves zero double-booking under 10 concurrent requests. |
| **Observability** | `infra/observability/`, `backend/src/config/metrics.ts` | Prometheus `/metrics`, OpenTelemetry tracing to Jaeger, Pino structured logs. |
| **Documentation** | `docs/`, `README.md` | PRD, TRD, Redesigned Plan, Design Tokens, Skills, Architecture doc, OpenAPI 3.1 YAML. |
