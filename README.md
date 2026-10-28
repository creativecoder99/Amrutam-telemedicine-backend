# Amrutam Telemedicine Engine - Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-orange.svg)](https://prometheus.io/)
[![License](https://img.shields.io/badge/License-Proprietary-black.svg)]()

> High-throughput, enterprise-grade Ayurvedic Telemedicine REST Engine built with Node.js, TypeScript, PostgreSQL 16, and Redis 7.  
> Engineered to handle 100,000+ daily clinical consultations with a **Zero Double-Booking Guarantee**, **AES-256-GCM Field-Level Envelope Encryption**, and **HMAC-SHA256 Tamper-Evident Digital Prescriptions**.

---

## Table of Contents
1. [Core Architectural Highlights](#1-core-architectural-highlights)
2. [System Architecture & Data Flow](#2-system-architecture--data-flow)
3. [Concurrency & Zero Double-Booking Engine](#3-concurrency--zero-double-booking-engine)
4. [Healthcare Security & Cryptography](#4-healthcare-security--cryptography)
5. [Domain Modules & API Reference](#5-domain-modules--api-reference)
6. [Local Development Setup](#6-local-development-setup)
7. [Environment Variables Configuration](#7-environment-variables-configuration)
8. [Testing & Verification](#8-testing--verification)
9. [Docker & Containerization](#9-docker--containerization)
10. [Production Deployment on Render](#10-production-deployment-on-render)

---

## 1. Core Architectural Highlights

- **Zero Double-Booking Distributed Concurrency**: Two-tier locking mechanism powered by Redis Redlock distributed mutex locks and a 10-minute temporary slot hold state (`HELD`).
- **Cryptographic Audit Trail**: Tamper-evident ledger using SHA-256 hash chains where each audit record seals the hash of the preceding record.
- **Envelope Encryption for Health Records (PHI)**: Sensitive patient medical history, SOAP clinical notes, and Ayurvedic diagnoses encrypted using AES-256-GCM.
- **HMAC-Signed Digital Prescriptions**: Every Ayurvedic formulation schedule is stamped with an HMAC-SHA256 signature, ensuring prescription legality and authenticity.
- **Dual-Mode Persistence Layer**: Seamlessly connects to PostgreSQL 16 and Redis 7 in production, while featuring an automatic in-memory fallback store for zero-dependency local development and testing.
- **Enterprise Observability**: Native Prometheus RED telemetry (`/metrics`), Kubernetes/Docker health check probes (`/health/live`, `/health/ready`, `/health/startup`), and structured JSON logging with Pino.

---

## 2. System Architecture & Data Flow

```mermaid
flowchart TB
    subgraph Clients["Telemedicine Clients"]
        WebPortal["Patient / Doctor Next.js Portal"]
        AdminDashboard["Clinical Governance Console"]
        ExternalWebhook["Razorpay Webhook Dispatcher"]
    end

    subgraph Gateway["API Gateway & Ingress"]
        CORS["CORS & Helmet Security Headers"]
        Telemetry["Request Duration Telemetry (Prometheus)"]
        RateLimiter["Redis Sliding-Window Rate Limiter"]
        AuthMiddleware["JWT & RBAC Middleware"]
    end

    subgraph Modules["Core Domain Modules"]
        AuthMod["Auth & MFA (TOTP)"]
        DocMod["Doctor Registry & KYC"]
        AvailMod["Availability & Recurring Slots"]
        BookingMod["Booking & Hold Engine"]
        PayMod["Payment & Escrow (Razorpay)"]
        ConsultMod["Consultations & Notes"]
        PrescriptMod["Prescriptions (HMAC Signed)"]
        PayoutMod["Doctor Wallet & Settlements"]
        AuditMod["Cryptographic Audit Ledger"]
        AnalyticsMod["Clinical Analytics KPIs"]
    end

    subgraph Storage["Storage & Messaging Layer"]
        RedisLock["Redis 7 (Redlock Mutex & Cache)"]
        PostgresDB[("PostgreSQL 16 (Partitioned Tables)")]
        InMemoryFallback[("In-Memory Store (Zero-Dependency Dev Fallback)")]
    end

    WebPortal --> Gateway
    AdminDashboard --> Gateway
    ExternalWebhook --> Gateway

    Gateway --> Modules

    BookingMod --> RedisLock
    Modules --> PostgresDB
    Modules -.-> InMemoryFallback
```

---

## 3. Concurrency & Zero Double-Booking Engine

To completely eliminate double-booking when multiple patients attempt to book the exact same consultation slot simultaneously, Amrutam uses a strict multi-phase reservation lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor PatientA as Patient A
    actor PatientB as Patient B
    participant API as Booking API
    participant Redis as Redis (Redlock)
    participant DB as PostgreSQL / Store

    PatientA->>API: POST /api/bookings/hold (slot_id)
    PatientB->>API: POST /api/bookings/hold (slot_id)
    
    API->>Redis: Acquire Mutex Lock (lock:slot:{id}, 10s TTL)
    Note over Redis: Patient A acquires lock first
    Redis-->>API: Lock ACQUIRED (Patient A)
    
    API->>DB: Verify slot status == 'AVAILABLE'
    DB-->>API: Slot is AVAILABLE
    API->>DB: Set status = 'HELD', heldBy = PatientA, expiresAt = +10m
    API->>Redis: Release Mutex Lock
    API-->>PatientA: 200 OK (Slot held for 10 minutes)

    Note over API: Patient B request enters critical section
    API->>DB: Verify slot status == 'AVAILABLE'
    DB-->>API: Slot status is 'HELD'
    API-->>PatientB: 409 Conflict (Slot currently locked by another patient)

    PatientA->>API: POST /api/payments/verify (order_id, razorpay_signature)
    API->>DB: Transition slot status 'HELD' -> 'BOOKED'
    API->>DB: Create Consultation (status = 'SCHEDULED')
    API-->>PatientA: 200 OK (Booking confirmed)
```

### Auto-Expiry Sweeper
If a patient abandons checkout, a background cleanup job releases expired holds (`ttlSeconds <= 0`) back to `AVAILABLE` status automatically.

---

## 4. Healthcare Security & Cryptography

### 4.1 AES-256-GCM Envelope Encryption
All protected health information (PHI) including chief complaints, clinical diagnoses, and Ayurvedic dosha findings are encrypted at rest:
- **Cipher**: `aes-256-gcm`
- **Stored Format**: `iv:authTag:ciphertext`
- **Key Derivation**: Managed via 256-bit `ENCRYPTION_MASTER_KEY`

### 4.2 Tamper-Evident Audit Hash Chain
Every sensitive action generates an immutable audit record chained to the previous record's cryptographic digest:

```mermaid
flowchart LR
    Genesis["Genesis Block\nHash: 00000000..."] --> Event1["Audit Event #1\nprevHash = Genesis\nPayload HMAC"]
    Event1 --> Event2["Audit Event #2\nprevHash = Event 1 Hash\nPayload HMAC"]
    Event2 --> EventN["Audit Event #N\nprevHash = Event (N-1)\nPayload HMAC"]
```

The system endpoint `GET /api/audit/verify-chain` verifies the entire chain's integrity end-to-end and detects any unauthorized modifications.

---

## 5. Domain Modules & API Reference

All endpoints are mounted under the `/api` prefix.

| Module | Base Path | Key Capabilities |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | User registration, JWT login, MFA/TOTP setup & validation, refresh tokens. |
| **Doctors** | `/api/doctors` | Doctor directory, search & specialty filter, doctor registration, admin KYC verification. |
| **Availability**| `/api/availability` | Doctor slot creation, slot listing, automated 7-day recurring bulk slot generation. |
| **Bookings** | `/api/bookings` | Slot reservation (`holdSlot`), hold cancellation, confirmed appointment creation. |
| **Payments** | `/api/payments` | Razorpay order creation, payment signature verification, webhook processing. |
| **Consultations**| `/api/consultations`| Clinical notes recording, status updates (`SCHEDULED` → `IN_PROGRESS` → `COMPLETED`). |
| **Prescriptions**| `/api/prescriptions`| Ayurvedic medicine formulation, digital HMAC signing, signature verification. |
| **Audit** | `/api/audit` | Cryptographic audit trail query, audit chain integrity verification. |
| **Analytics** | `/api/analytics` | Real-time clinical KPIs, revenue tracking, double-booking prevention counter. |
| **Payouts** | `/api/payouts` | Doctor earnings balance, payout requests, admin approval and settlement. |
| **Patients** | `/api/patients` | Patient profile updates, Prakriti (Vata/Pitta/Kapha) assessment, medical history. |

### Health & Monitoring Endpoints
- `GET /health/live` - Liveness probe (service is running)
- `GET /health/ready` - Readiness probe (checks PostgreSQL & Redis health)
- `GET /health/startup` - Startup probe (reports process uptime)
- `GET /metrics` - Prometheus metrics exposition format

---

## 6. Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **PostgreSQL 16** & **Redis 7** *(Optional for local dev; if omitted, the backend automatically runs with its built-in in-memory fallback store)*

### Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/creativecoder99/Amrutam-telemedicine-backend.git
   cd Amrutam-telemedicine-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   *(Review and configure values in `.env` as described in Section 7).*

4. **Run Database Migrations (if using PostgreSQL)**:
   ```bash
   npm run migrate
   ```

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The API will start at: `http://localhost:4000/api`  
   Health check: `http://localhost:4000/health/ready`  
   Metrics: `http://localhost:4000/metrics`

---

## 7. Environment Variables Configuration

> **CRITICAL SECURITY NOTICE**: Never commit your `.env` file or sensitive credentials to version control. The values below are placeholder examples for development purposes.

| Variable | Required | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `production`, `test`). |
| `PORT` | Optional | `4000` | HTTP port on which the Express server listens. |
| `DATABASE_URL` | Optional | `postgresql://user:pass@localhost:5432/amrutam_db` | PostgreSQL connection string. (Falls back to memory if unreachable). |
| `REDIS_URL` | Optional | `redis://localhost:6379` | Redis connection URL for distributed locking. (Falls back to memory mutex). |
| `JWT_SECRET` | **Required** | `your_jwt_access_secret_min_32_chars` | Secret key used to sign JWT access tokens. |
| `JWT_REFRESH_SECRET` | **Required** | `your_jwt_refresh_secret_min_32_chars` | Secret key used to sign JWT refresh tokens. |
| `ENCRYPTION_MASTER_KEY`| **Required** | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | 256-bit (64 hex chars) master key for AES-256-GCM envelope encryption. |
| `AUDIT_HMAC_SECRET` | **Required** | `your_audit_hmac_secret_chain_key` | Secret key for tamper-evident audit ledger and prescription HMAC signatures. |
| `CORS_ORIGIN` | Optional | `http://localhost:3000` | Allowed frontend origin or `*` for wildcard. |
| `LOG_LEVEL` | Optional | `info` | Pino logging level (`trace`, `debug`, `info`, `warn`, `error`). |
| `RAZORPAY_KEY_ID` | Optional | `rzp_test_your_razorpay_key_id` | Razorpay public key ID for payment order creation. |
| `RAZORPAY_KEY_SECRET` | Optional | `rzp_test_your_razorpay_secret` | Razorpay secret key for payment signature verification. |

---

## 8. Testing & Verification

The backend includes a comprehensive automated test suite covering unit logic, integration routes, and high-concurrency race condition scenarios:

```bash
# Run unit & integration test suites
npm run test:ts

# Type-check without emitting
npm run lint

# Build production bundle
npm run build
```

### Concurrency Race-Condition Test
To verify the Zero Double-Booking Guarantee, run the concurrency test suite:
```bash
npx tsx tests/integration/concurrency.test.ts
```
This test fires 10 simultaneous HTTP requests against the exact same consultation slot within a 5ms window. It validates that exactly **1 request receives `201 Created`** while **9 requests receive `409 Conflict`**.

---

## 9. Docker & Containerization

A hardened multi-stage `Dockerfile` is provided that runs the application as an unprivileged non-root user (`nodejs:1001`):

```bash
# Build Docker image
docker build -t amrutam-telemedicine-backend:latest .

# Run Docker container
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_production_secret \
  -e ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  -e AUDIT_HMAC_SECRET=your_production_audit_key \
  amrutam-telemedicine-backend:latest
```

---

## 10. Production Deployment on Render

This backend is designed to run seamlessly on [Render.com](https://render.com) as a **Web Service**:

1. **Create Web Service** on Render and connect repository `Amrutam-telemedicine-backend`.
2. **Configure Service Settings**:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Auto-Deploy**: `Yes` (Branch: `main`)
3. **Set Environment Variables in Render Dashboard**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` *(Render sets this automatically)*
   - `JWT_SECRET`: *(Generate a 32+ character random secret)*
   - `JWT_REFRESH_SECRET`: *(Generate a 32+ character random secret)*
   - `ENCRYPTION_MASTER_KEY`: *(Generate 64 hex characters)*
   - `AUDIT_HMAC_SECRET`: *(Generate a 32+ character random secret)*
   - `CORS_ORIGIN`: `*` *(or your frontend Render URL: `https://your-frontend.onrender.com`)*
   - `DATABASE_URL`: *(Your Render PostgreSQL connection string, optional)*
   - `REDIS_URL`: *(Your Render Redis connection string, optional)*

---

## License
Proprietary & Confidential. Copyright © 2026 Amrutam Pharmaceuticals & Telehealth Pvt. Ltd. All rights reserved.
