-- Amrutam Telemedicine System: Production Performance Indexes & Constraints (Migration 003)

-- 1. Anti-Double Booking: Unique Partial Constraint
-- Ensures no doctor can have two overlapping slots at the exact same start_time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doctor_active_slot 
ON availability_slots (doctor_id, start_time) 
WHERE status != 'BLOCKED';

-- 2. Doctor Discovery & Multi-criteria Search Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_specialty_rating 
ON doctors (primary_specialty, rating DESC);

CREATE INDEX IF NOT EXISTS idx_doctors_fee 
ON doctors (consultation_fee ASC);

CREATE INDEX IF NOT EXISTS idx_doctors_verified 
ON doctors (is_verified);

-- 3. Availability Query Optimization
CREATE INDEX IF NOT EXISTS idx_availability_slots_doctor_status 
ON availability_slots (doctor_id, status, start_time);

CREATE INDEX IF NOT EXISTS idx_availability_slots_held_expires 
ON availability_slots (status, hold_expires_at) 
WHERE status = 'HELD';

-- 4. Consultation & Clinical Records Indexes
CREATE INDEX IF NOT EXISTS idx_consultations_patient_status 
ON consultations (patient_id, status, scheduled_start_time DESC);

CREATE INDEX IF NOT EXISTS idx_consultations_doctor_status 
ON consultations (doctor_id, status, scheduled_start_time DESC);

-- 5. Prescriptions Indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id 
ON prescriptions (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id 
ON prescriptions (consultation_id);

-- 6. Audit Trail Hash Validation Index
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_hash 
ON audit_logs (record_hash);

-- 7. Idempotency Key Expiry Cleanup Index
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at 
ON idempotency_keys (expires_at);
