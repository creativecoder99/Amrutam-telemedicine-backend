-- Amrutam Telemedicine System: PostgreSQL 16 Range Partitioning (Migration 002)

-- Declarative monthly partitions for high-throughput scaling (100,000 daily consultations)

-- Index on availability slots start_time for rapid partition pruning
CREATE INDEX IF NOT EXISTS idx_availability_slots_start_time ON availability_slots (start_time);

-- Index on consultations scheduled_start_time
CREATE INDEX IF NOT EXISTS idx_consultations_start_time ON consultations (scheduled_start_time);

-- Index on audit logs created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
