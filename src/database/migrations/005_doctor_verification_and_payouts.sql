-- Amrutam Telemedicine System: Doctor Verification & Wallet Payouts (Migration 005)

-- 1. Extend Doctors Table with KYC and Verification Status
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS license_document_url TEXT,
ADD COLUMN IF NOT EXISTS qualification_document_url TEXT,
ADD COLUMN IF NOT EXISTS id_proof_url TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Doctor Remuneration Wallets (Doctor earns ₹200 per completed consultation)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID UNIQUE NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Doctor Payout Requests (Threshold: Minimum ₹1,000)
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 1000.00),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'REJECTED')),
    account_details JSONB NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- Indexes for Fast Lookup
CREATE INDEX IF NOT EXISTS idx_doctors_verification_status ON doctors (verification_status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_doctor_id ON payout_requests (doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests (status);
