# Amrutam Telemedicine System — Product Requirements Document (PRD)

| **Document Version** | 1.0.0 |
| **Status**           | Approved for Engineering |
| **Target Scale**     | 100,000 daily consultations |
| **Primary Authors**  | Amrutam Backend & Systems Architecture Team |
| **Target Stack**     | Next.js 15, Node.js (TypeScript), PostgreSQL 16, Redis 7 |

---

## 1. Executive Summary & Product Vision

### 1.1 Vision
**Amrutam Telemedicine** is an enterprise-grade digital health and Ayurvedic telemedicine platform designed to connect patients globally with verified Ayurvedic Vaidyas (doctors), holistic healthcare practitioners, and modern medical consultants. 

The platform bridges ancient Ayurvedic wisdom (Prakriti analysis, herbal formulations, lifestyle interventions) with modern clinical rigor (digitally signed prescriptions, real-time vital tracking, automated consultation lifecycles, and strict healthcare compliance under ABDM/DISHA/HIPAA).

### 1.2 Key Objectives
1. **Uncompromising Scalability**: Seamlessly orchestrate **100,000 daily consultations** with peak throughput exceeding 2,000 requests/sec.
2. **Sub-second Performance**: Guarantee read latencies (p95) **< 200ms** and write latencies (p95) **< 500ms**.
3. **High Availability**: Provide **99.95% uptime** (less than 4.38 hours of unscheduled downtime per year) using active-standby database failover, read replicas, and circuit breakers.
4. **Zero Double-Booking Guarantee**: Absolute atomicity and transactional integrity during concurrent slot reservation using distributed locks and database-level isolation.
5. **Healthcare Security & Privacy**: Strict protection of Protected Health Information (PHI) via AES-256-GCM envelope encryption, multi-factor authentication (MFA/TOTP), fine-grained Role-Based Access Control (RBAC), and tamper-evident audit logs.

---

## 2. Target Personas & Stakeholders

| Persona | Role | Key Needs & Pain Points |
| :--- | :--- | :--- |
| **P1: Patient** | Care Seeker | Frictionless doctor search by Prakriti/specialty; real-time slot booking without payment dropouts; instant consultation access; secure, downloadable digital prescriptions; health record privacy. |
| **P2: Doctor (Vaidya)** | Care Provider | Dynamic availability management; automatic calendar sync; prevention of overlapping appointments; structured consultation flow (Dosha assessment, symptoms, diagnosis); digital prescription generator with Ayurvedic formulation directory. |
| **P3: Clinic / Admin** | Operations & Governance | Real-time analytics on doctor utilization, consultation fulfillment rates, revenue share; automated doctor KYC/license verification; dispute resolution; SLA monitoring. |
| **P4: Compliance Officer** | Regulatory & Security | Verifiable audit trails for every PHI access; DISHA / ABDM (Ayushman Bharat Digital Mission) compliance; data retention policy enforcement; exportable forensic logs. |

---

## 3. Core Problem Statements & Value Proposition

1. **The Double-Booking Epidemic in Telehealth**:
   * *Problem*: Flash booking bursts during morning peak hours (08:00–10:00) cause race conditions where two patients pay for the same doctor slot.
   * *Solution*: A two-tier locking mechanism (Redis Redlock with 10-minute TTL hold + PostgreSQL `SELECT ... FOR UPDATE` row lock with unique composite index constraint).
2. **Payment Failure & Inconsistent State**:
   * *Problem*: Network drops or gateway timeouts lead to money deducted without consultation creation or vice versa.
   * *Solution*: Idempotent payment webhooks and a transactional Orchestrated Saga with compensating refund actions.
3. **Clinical Prescription Authenticity & Misplacement**:
   * *Problem*: Unstructured prescriptions lead to pharmacy dispensing errors; forged prescriptions pose legal and health risks.
   * *Solution*: Cryptographically signed (HMAC-SHA256/RSA-PSS) structured prescriptions with dosage, frequency, Anupana (carrier), and duration.
4. **Data Privacy in Ayurvedic Consultations**:
   * *Problem*: Health history, lifestyle habits, and confidential medical conditions must remain strictly private between doctor and patient.
   * *Solution*: Field-level encryption (AES-256-GCM) for clinical notes and diagnosis, role-based token masking, and immutable audit logs.

---

## 4. Detailed Functional Specifications

### 4.1 Module 1: User Lifecycle & Identity Access Management (IAM)
* **User Roles**: `PATIENT`, `DOCTOR`, `ADMIN`, `AUDITOR`.
* **Patient Journey**:
  * Registration & Authentication (JWT 15m + Refresh Token 7d).
  * Comprehensive Patient Dashboard: View and update personal health details, Prakriti constitution, medical history, emergency contacts.
  * Direct Doctor Discovery & Slot Booking with 10-minute Redlock exclusive hold.
  * My Bookings Section: Real-time appointment timeline, waiting room trigger, direct video room link.
  * My Prescriptions Section: Downloadable and printable cryptographically verifiable digital prescriptions.
* **Doctor Onboarding & Verification (KYC)**:
  * Doctor registers credentials (degree, qualification, license number, specialties, experience, fee, bio).
  * Document upload / verification attachments: Medical License Certificate, Medical Degree, Government ID proof.
  * Initial status: `PENDING_VERIFICATION`.
  * Guard: Doctor cannot publish availability slots or receive bookings until verified by Admin.
  * Admin reviews credentials and approves (`VERIFIED`) or rejects (`REJECTED` with reason).
* **Doctor Wallet & Payout Engine**:
  * Fixed Practitioner Remuneration: Doctor earns **₹200** per completed patient consultation.
  * Automatic Wallet Credit: Credited immediately upon consultation status transitioning to `COMPLETED`.
  * Payout Threshold: **₹1,000 minimum balance** required to submit a withdrawal request.
  * Payout Lifecycle: Doctor submits payout request -> Enters `PENDING` state -> Admin reviews bank account details and executes payment -> Admin marks payout as `PROCESSED`.
* **Admin Governance & Full CRUD Operations**:
  * Holistic Telemedicine Analytics: Total patients, verified/pending doctors, consultation fulfillment rate, revenue, active holds.
  * User Management (CRUD): Admin can create, view, edit, and delete patient accounts and doctor profiles.
  * Payout Management: Centralized queue of doctor payout requests with approve/process actions.
  * Tamper-evident HMAC-SHA256 audit log monitoring.
* **Payment Gateway Integration**:
  * Razorpay Checkout API & webhook support with fallback mock adapter for development/testing.
  * Idempotent payment capture preventing double charges.

### 4.2 Module 2: Doctor Availability & Scheduling Engine
* **Availability Rules**:
  * Doctors define weekly recurring schedules (e.g., Mon–Fri, 09:00–13:00 and 15:00–19:00).
  * Slot granularity: configurable (default 15, 30, or 45 minutes).
  * Dynamic buffer times between consultations (default: 5 minutes) to avoid doctor fatigue.
  * Vacation / Blackout date overrides.
* **Slot Generation**:
  * Rolling slot generation (30 days in advance) via scheduled background worker.
  * Timezone normalization: All slots persisted in UTC; converted to doctor/patient local timezones at API edge.
* **Slot States**:
  * `AVAILABLE`: Free to be selected.
  * `HELD`: Locked temporarily for a patient actively in checkout (10-minute TTL).
  * `BOOKED`: Confirmed with completed payment.
  * `BLOCKED`: Disabled by doctor or admin.

### 4.3 Module 3: Booking Flow, Idempotency & Payment Lifecycle
* **Step 1 — Slot Hold (Reservation Phase)**:
  * Patient selects an `AVAILABLE` slot.
  * System acquires a Redis distributed lock for `slot:{slot_id}`.
  * Slot status transitions to `HELD` with an expiration timestamp (`now() + 10 mins`).
  * If the lock is held or slot is not `AVAILABLE`, return `409 Conflict` with clear error message.
* **Step 2 — Order Creation & Idempotent Checkout**:
  * Patient initiates checkout providing an `Idempotency-Key` header (UUIDv4).
  * System checks if `Idempotency-Key` exists:
    * If cached as `COMPLETED`: returns previously created payment order immediately.
    * If cached as `PENDING`: rejects concurrent duplicate request with `409 Conflict`.
    * If new: creates an internal Payment Order linked to the slot hold and delegates to the payment gateway (Razorpay / Stripe mock).
* **Step 3 — Webhook & Payment Reconciliation**:
  * Payment gateway sends signed webhook (`payment.success` or `payment.failed`).
  * Webhook handler validates HMAC-SHA256 signature and uses an idempotent processor.
  * Upon success:
    * Slot status transitions from `HELD` to `BOOKED`.
    * Consultation record created in status `SCHEDULED`.
    * Confirmation notification dispatched asynchronously via BullMQ.
  * Upon failure or hold expiry:
    * Slot reverted to `AVAILABLE`.
    * Hold released in Redis.
* **Step 4 — Rescheduling & Cancellation**:
  * Patient can cancel or reschedule up to 2 hours prior to consultation.
  * Automated refund trigger based on cancellation policy tier (100% refund > 24h, 50% refund 2–24h, 0% refund < 2h).

### 4.4 Module 4: Consultation Lifecycle & Telemedicine Session
* **Consultation States**:
  * `SCHEDULED`: Confirmed booking awaiting appointment time.
  * `WAITING_ROOM`: Patient has checked in (up to 10 minutes prior).
  * `IN_PROGRESS`: Doctor has admitted the patient and initiated video/audio bridge.
  * `COMPLETED`: Consultation concluded, clinical notes saved, prescription generated.
  * `NO_SHOW`: Either patient or doctor failed to join within 15 minutes of scheduled time.
  * `CANCELLED`: Cancelled by patient, doctor, or system.
* **Pre-Consultation Vitals & Intake**:
  * Patient uploads symptoms, previous prescriptions, pulse/blood pressure, and photos (secure S3 pre-signed URLs).
* **Session Metadata & Clinical Notes**:
  * Consultation duration, start/end timestamps, connection quality metrics.
  * Encrypted SOAP notes (Subjective, Objective, Assessment, Plan) authored by the doctor.

### 4.5 Module 5: Prescription Engine
* **Clinical Prescription Schema**:
  * Patient ID, Doctor ID, Consultation ID, Unique Prescription Number (`RX-YYYYMMDD-XXXXXX`).
  * Diagnosis & Ayurvedic Dosha imbalance (e.g., Pitta-Vata aggravation).
  * Medication line items:
    * Medicine Name (standardized Ayurvedic formulations e.g., Ashwagandharishta, Triphala Churna, Brahmi Vati).
    * Formulation type (Tablet, Syrup, Powder/Churna, Oil/Taila, Decoction/Kwath).
    * Dosage (e.g., 2 tablets / 10 ml), Frequency (e.g., Twice daily, after meals).
    * Anupana (Co-prescribed vehicle: Warm water, Honey, Warm milk).
    * Duration (e.g., 21 days).
  * Lifestyle and Dietary Advice (Pathya & Apathya).
* **Security & Integrity**:
  * Doctor's digital signature generated using an HMAC-SHA256 signature over the canonicalized JSON payload.
  * Immutability: Once signed and status becomes `FINALIZED`, the prescription cannot be edited. Corrections require an addendum or revocation.
* **Asynchronous PDF Generation**:
  * BullMQ background job compiles the prescription into a branded PDF, uploads to encrypted S3 bucket, and notifies the patient with a time-limited pre-signed download link.

### 4.6 Module 6: Search & Discovery Engine
* **Filtering Criteria**:
  * Medical Specialty (e.g., Ayurvedic Internal Medicine/Kayachikitsa, Dermatology/Twak Roga, Panchakarma, Modern Medicine/General Physician).
  * Consultation Language (English, Hindi, Sanskrit, Regional).
  * Availability date & time window.
  * Consultation fee range.
  * Doctor ratings & patient review scores.
* **Performance SLAs**:
  * Search queries resolved in **< 50ms** using PostgreSQL composite GBN-indexes, trigram full-text search (`pg_trgm`), and Redis cache-aside layer.

### 4.7 Module 7: Compliance, Privacy & Audit Trail
* **Regulatory Alignment**:
  * Designed to comply with India's **DISHA** (Digital Information Security in Healthcare Act), **ABDM** (Ayushman Bharat Digital Mission), and US **HIPAA** guidelines.
* **Field-Level Encryption (FLE)**:
  * All clinical diagnoses, medical history, and prescription notes encrypted at application layer using AES-256-GCM before database write.
* **Immutable Audit Trail**:
  * Every read of PHI, state change, auth event, and admin operation logs an immutable record in `audit_logs`.
  * Audit log fields: `id`, `user_id`, `user_role`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `payload_hash`, `created_at`.
  * Cryptographic chaining: Each audit entry records the SHA-256 hash of the previous record, preventing silent record deletion or log tampering.

### 4.8 Module 8: Admin Analytics & Governance
* **Key Metrics & KPIs**:
  * Daily / Weekly / Monthly Consultation Volumes.
  * Doctor Utilization Rate = `(Booked Slots / Total Available Slots) * 100`.
  * Average Consultation Duration vs Scheduled Duration.
  * No-show rates segmented by doctor and patient cohort.
  * Financial metrics: Gross Merchandise Value (GMV), platform fee cuts, doctor payout reconciliations.
* **Caching & Aggregation**:
  * Heavy aggregation queries pre-computed every 15 minutes by worker jobs into summary tables and cached in Redis.

---

## 5. Non-Functional Requirements (NFRs)

| Attribute | Metric / Requirement | Verification Method |
| :--- | :--- | :--- |
| **Throughput** | 100,000 completed consultations/day (~1.16/sec continuous avg, 20–50/sec peak write bursts, 1,000–2,000/sec peak read bursts). | K6 / Artillery load testing suite. |
| **Latency (Reads)** | p95 < 200ms, p99 < 400ms for all search, slot listing, and profile queries. | OpenTelemetry trace metrics & Prometheus. |
| **Latency (Writes)**| p95 < 500ms for booking holds, payments, and prescription creation. | Prometheus histogram `http_request_duration_seconds`. |
| **Availability** | 99.95% uptime across calendar year. | Synthetic health check probes (`/health/ready`). |
| **Scalability** | Horizontal scaling of stateless API nodes; vertical + read replica scaling for PostgreSQL; clustered Redis. | Kubernetes HPA (Horizontal Pod Autoscaler). |
| **RPO & RTO** | Recovery Point Objective (RPO) < 5 minutes; Recovery Time Objective (RTO) < 30 minutes. | PostgreSQL continuous WAL archiving to S3; automated restore drill. |
| **Security** | Zero critical/high vulnerabilities; OWASP Top 10 mitigations; AES-256-GCM data encryption at rest; TLS 1.3 in transit. | Trivy container scan, npm audit, automated security checklist. |

---

## 6. User Journey Maps & Core Scenarios

### Journey 1: Patient Discovers Doctor, Books Slot & Attends Consultation
```
[Patient] -> Search "Kayachikitsa" -> Filter Available Today -> Select 10:30 AM Slot
          -> [API acquires 10-min Redis Lock] -> Slot status HELD
          -> [Patient Enters Payment Details] -> Idempotent Checkout POST with UUIDv4 key
          -> [Payment Gateway Success Webhook] -> Slot status BOOKED -> Consultation SCHEDULED
          -> [Notification Worker] -> Dispatches WhatsApp/SMS/Email confirmation
          -> [Appointment Time] -> Joins Waiting Room -> Consultation IN_PROGRESS
          -> [Doctor Concludes] -> Issues Digitally Signed Prescription
          -> [Prescription Worker] -> Generates PDF -> Patient downloads from Portal
```

---

## 7. Acceptance Criteria (Gherkin Syntax)

```gherkin
Feature: Concurrency & Slot Double-Booking Prevention
  Scenario: Two patients attempt to book the exact same slot simultaneously
    Given Doctor "Dr. Sharma" has an "AVAILABLE" slot with ID "slot-101" at "10:00 AM"
    When Patient A submits a hold request for "slot-101" with Idempotency Key "key-A"
    And Patient B submits a hold request for "slot-101" with Idempotency Key "key-B" concurrently within 10ms
    Then Exactly one patient receives HTTP 201 Created with slot status "HELD"
    And The other patient receives HTTP 409 Conflict with code "SLOT_ALREADY_RESERVED"
    And The database reflects exactly one active hold on "slot-101"

Feature: Idempotent Payment Processing
  Scenario: Client network drops and retries payment request with identical idempotency key
    Given A held slot with ID "slot-101" by Patient A
    When Patient A sends POST /api/payments with Idempotency-Key "idemp-999"
    And The request succeeds and returns Payment ID "pay-501" with HTTP 200
    And Due to network packet drop, Patient A resends the exact same POST /api/payments with Idempotency-Key "idemp-999"
    Then The server does not process a second charge
    And Returns HTTP 200 with the exact same response payload and Payment ID "pay-501"
    And Only one payment record exists in the database
```

---

## 8. Release Milestones & Phase Gate

* **Phase 1: Architecture & Technical Foundations** — TRD approval, DB schemas, migrations, seed data, Redis locking baseline.
* **Phase 2: Core Domain Services** — Auth/MFA, Doctor availability, Slot reservation, Idempotent booking.
* **Phase 3: Consultation & Prescription Lifecycle** — Session state machine, digital signatures, async PDF generator.
* **Phase 4: Security, Observability & Analytics** — AES-256-GCM field encryption, audit log integrity, Prometheus & OpenTelemetry instrumentation, Admin KPIs.
* **Phase 5: Automated Testing & Verification** — Unit tests, concurrent race condition integration tests, load testing, containerization.
