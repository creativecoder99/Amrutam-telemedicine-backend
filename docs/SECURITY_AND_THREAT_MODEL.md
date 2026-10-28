# Amrutam Telemedicine System — Security Checklist & STRIDE Threat Model

| Metadata | Details |
| :--- | :--- |
| **System** | Amrutam Clinical Telemedicine Engine & Patient Portal |
| **Document Version** | 1.0.0 (Production Security Specification) |
| **Regulatory Scope** | DISHA (India), ABDM (M1/M2/M3), HIPAA, DPDP Act 2023 |
| **Classification** | Restricted / Healthcare Clinical Governance |

---

## 1. STRIDE Threat Model Matrix

The STRIDE methodology analyzes all major threats across the system's components, communication channels, and data stores:

| Threat Category | Target Component | Threat Scenario | Impact | Mitigation in Amrutam Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | User / Doctor Auth (`/api/auth`) | Attacker impersonates a certified Ayurvedic doctor or patient. | Unauthorized access to patient health history; fraudulent prescriptions. | **JWT with short-lived access tokens (15m)**, secure HTTP-only refresh tokens, **TOTP-based MFA** for doctors/admins, and strict password hashing via **Bcrypt (work factor 12)**. |
| **Tampering** | Prescriptions (`/api/prescriptions`) | Patient or rogue pharmacy alters medicine dosage or formulation post-consultation. | Patient health hazard; illegal dispensing of herbal compounds. | **HMAC-SHA256 Digital Signature**: Every issued prescription signs all medicines, dosage, and patient IDs with a system secret. Altering a single character invalidates the cryptographic signature. |
| **Tampering** | Audit Trail (`/api/audit`) | Malicious insider edits database records to erase evidence of data snooping. | Regulatory non-compliance; loss of legal auditability. | **Cryptographic Hash Chain Ledger**: Every record stores `SHA-256(seq || timestamp || actorId || payload || prevHash)`. Any modified row breaks the entire chain verification. |
| **Repudiation** | Clinical Consultations & Notes | Doctor denies prescribing a specific formulation or patient denies attending consult. | Medical malpractice disputes; legal liability. | Non-repudiation enforced via **immutable audit logs** linking JWT subject IDs, timestamps, client IPs, and digital prescription signatures. |
| **Information Disclosure** | Clinical SOAP Notes & PHI (`consultations`) | Database breach or disk dump exposes patient Prakriti, chief complaints, and diagnoses. | Catastrophic privacy breach; DISHA / HIPAA violation. | **AES-256-GCM Envelope Encryption**: Sensitive clinical SOAP notes are encrypted at rest with a 256-bit key (`iv:authTag:ciphertext`). Raw text is never written to disk. |
| **Denial of Service (DoS)** | Slot Booking Engine (`/api/bookings/hold`) | Distributed botnet locks all doctor slots simultaneously without paying. | Platform paralysis; legitimate patients cannot book consultations. | **Redis sliding-window rate limiting (100 req/min/IP)**, 10-minute hold window auto-expiration, and partial unique constraint in PostgreSQL. |
| **Elevation of Privilege** | Doctor Verification / Payouts | Patient attempts to approve doctor KYC or withdraw doctor earnings. | Financial theft; unverified practitioners practicing medicine. | **Role-Based Access Control (RBAC)** enforced at router level (`requireRole(['ADMIN'])`). Patient tokens are rejected with `403 Forbidden`. |

---

## 2. Cryptographic Specifications

### 2.1 AES-256-GCM Field-Level Envelope Encryption
```
Plaintext PHI (SOAP Notes, Diagnoses)
             │
             ▼
  ┌───────────────────────┐
  │   crypto.createCipher  │ <── Master Key (256-bit / 64 hex chars)
  │    ('aes-256-gcm')    │ <── Initialization Vector (16 bytes random)
  └───────────────────────┘
             │
             ▼
   Stored Format: iv : authTag : ciphertext (Base64)
```
- **Integrity Guarantee**: The 128-bit authentication tag guarantees that ciphertext cannot be altered or bit-flipped in storage without decryption failing.

### 2.2 HMAC-SHA256 Digital Prescription Signing
```
Payload: { consultationId, doctorId, patientId, diagnosis, medicines }
             │
             ▼
  ┌───────────────────────┐
  │   crypto.createHmac   │ <── System Audit Secret Key
  │       ('sha256')      │
  └───────────────────────┘
             │
             ▼
   Hex Signature: a7b8c9d0e1f2... (Appended to Prescription Object)
```

---

## 3. Healthcare Regulatory Compliance Checklist

### 3.1 DISHA (Digital Information Security in Healthcare Act - India)
- [x] **Consent Architecture**: Patient explicit consent captured before teleconsultation initiation.
- [x] **Data Minimization**: Only clinically relevant information collected during Prakriti assessment.
- [x] **Encryption at Rest & in Transit**: TLS 1.3 enforced for transport; AES-256-GCM for clinical records at rest.
- [x] **Breach Notification Audit**: Tamper-evident audit chain logging all access to patient health identifiers (PHI).

### 3.2 ABDM (Ayushman Bharat Digital Mission)
- [x] **M1 (ABHA Creation & Verification)**: Data models compatible with 14-digit ABHA address linking.
- [x] **M2 (Health Information Provider - HIP)**: Standardized prescription serialization with digital signatures.
- [x] **M3 (Health Information User - HIU)**: Structured Ayurvedic diagnostic taxonomy (Prakriti, Dosha, Chikitsa).

### 3.3 HIPAA Security Rule Alignment
- [x] **§ 164.312(a)(1) Access Control**: Unique user identification, emergency access procedures, automatic session timeout.
- [x] **§ 164.312(b) Audit Controls**: Cryptographic tamper-evident ledger logging all PHI operations.
- [x] **§ 164.312(c)(1) Integrity**: HMAC digital signatures protecting clinical documentation against alteration.
- [x] **§ 164.312(e)(1) Transmission Security**: Strict TLS 1.3 encryption across all public network endpoints.

---

## 4. OWASP Top 10 Security Controls

| OWASP Vulnerability | Amrutam Defensive Implementation |
| :--- | :--- |
| **A01: Broken Access Control** | Explicit RBAC middleware (`authenticateUser`, `requireRole`) on all non-public endpoints. |
| **A02: Cryptographic Failures** | Strict use of modern cryptography: AES-256-GCM, HMAC-SHA256, Bcrypt (work factor 12). No weak ciphers (MD5, SHA1, DES). |
| **A03: Injection** | Parameterized SQL queries via `pg` pool; schema validation via Zod on all incoming request bodies. |
| **A04: Insecure Design** | Two-tier distributed locking preventing race conditions; defense-in-depth architecture. |
| **A05: Security Misconfiguration**| Helmet security headers enabled; sensitive server headers (`X-Powered-By`) suppressed; unprivileged non-root container user (`nodejs:1001`). |
| **A06: Vulnerable Components** | Dependencies locked via `package-lock.json` and scanned with `npm audit`. |
| **A07: Identification & Auth Failures** | Short-lived JWTs (15 min); TOTP MFA for doctors/admins; account lockout on repeated failed attempts. |
| **A08: Software & Data Integrity**| Digital HMAC signing of clinical prescriptions and cryptographic audit chain verification. |
| **A09: Security Logging Failures** | Pino structured JSON logging with correlation IDs; Prometheus RED metrics for error rate monitoring. |
| **A10: Server-Side Request Forgery (SSRF)**| Strict validation and whitelisting of any outgoing webhook destinations. |

---

## 5. Security Incident Response & Key Rotation Playbook

### Master Key Rotation Procedure
1. Generate new 256-bit encryption master key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Re-encrypt stored records using dual-key migration worker (`OLD_KEY` decrypts, `NEW_KEY` encrypts).
3. Update environment secret in Render / container secret manager and restart services.
