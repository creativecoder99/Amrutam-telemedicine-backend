-- Amrutam Telemedicine System: Authentic Seed Data (Migration 004)

-- Password hash for 'Amrutam@123' (bcrypt work factor 10)
-- $2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu
-- For portability across environments, we insert known UUIDs

-- 1. Insert Doctors
INSERT INTO users (id, email, password_hash, role, mfa_enabled) VALUES
('11111111-1111-1111-1111-111111111111', 'dr.rajesh@amrutam.co.in', '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', 'DOCTOR', true),
('22222222-2222-2222-2222-222222222222', 'dr.ananya@amrutam.co.in', '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', 'DOCTOR', true),
('33333333-3333-3333-3333-333333333333', 'dr.vikramaditya@amrutam.co.in', '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', 'DOCTOR', true),
('44444444-4444-4444-4444-444444444444', 'dr.priya@amrutam.co.in', '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', 'DOCTOR', false),
('55555555-5555-5555-5555-555555555555', 'patient.arjun@gmail.com', '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', 'PATIENT', false),
('66666666-6666-6666-6666-666666666666', 'admin@amrutam.co.in', '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', 'ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert User Profiles
INSERT INTO user_profiles (user_id, full_name, phone, gender, prakriti_type) VALUES
('11111111-1111-1111-1111-111111111111', 'Dr. Vaidya Rajesh Sharma', '+91 98200 11223', 'MALE', 'PITTA_KAPHA'),
('22222222-2222-2222-2222-222222222222', 'Dr. Vaidya Ananya Deshmukh', '+91 98200 44556', 'FEMALE', 'VATA_PITTA'),
('33333333-3333-3333-3333-333333333333', 'Dr. Vaidya Vikramaditya Joshi', '+91 98200 77889', 'MALE', 'TRIDOSHIC'),
('44444444-4444-4444-4444-444444444444', 'Dr. Vaidya Priya Nair', '+91 98200 99001', 'FEMALE', 'PITTA'),
('55555555-5555-5555-5555-555555555555', 'Arjun Verma', '+91 98765 43210', 'MALE', 'VATA'),
('66666666-6666-6666-6666-666666666666', 'Amrutam Clinical Governance Admin', '+91 98200 00000', 'OTHER', 'UNDETERMINED')
ON CONFLICT DO NOTHING;

-- 3. Insert Doctor Records
INSERT INTO doctors (id, user_id, license_number, qualification, primary_specialty, secondary_specialties, experience_years, bio, consultation_fee, rating, review_count, is_verified) VALUES
('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'AY-NMC-2009-4821', 'BAMS, MD (Ayurveda) - Kayachikitsa', 'Kayachikitsa (Internal Medicine)', ARRAY['Digestive Disorders', 'Metabolic Syndrome', 'Agni Deepana'], 15, 'Senior Ayurvedic Physician with 15 years of clinical mastery in gut health, chronic acidity, IBS, and metabolic harmony through classical herbal formulations.', 650.00, 4.95, 342, true),
('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'AY-CCIM-2012-8812', 'BAMS, MS (Ayurveda) - Shalakya Tantra', 'Shalakya Tantra (ENT & Eye Care)', ARRAY['Migraine Management', 'Sinusitis', 'Computer Vision Syndrome'], 12, 'Renowned practitioner specializing in supra-clavicular disorders, chronic sinusitis, tension migraines, and holistic eye therapies like Netra Tarpana guidance.', 750.00, 4.92, 218, true),
('d3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'AY-NMC-2006-1029', 'BAMS, Fellowship in Panchakarma (Kerala)', 'Panchakarma (Detoxification)', ARRAY['Joint Pain & Arthritis', 'Stress & Insomnia', 'Cellular Rejuvenation'], 18, 'Gold medalist in classical Panchakarma therapy. Guides structured home-based Shamana treatments and post-cleansing Rasayana rejuvenation regimens.', 900.00, 4.98, 480, true),
('d4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'AY-CCIM-2014-6102', 'BAMS, Diploma in Prasuti & Stri Roga', 'Prasuti & Stri Roga (Women Health)', ARRAY['PCOS/PCOD Care', 'Hormonal Balance', 'Postpartum Wellness'], 10, 'Dedicated women health specialist integrating gentle herbs, cycle sync nutrition, and mindfulness for long-term endocrine balance.', 600.00, 4.88, 195, true)
ON CONFLICT (license_number) DO NOTHING;

-- 4. Insert Initial Genesis Audit Log
INSERT INTO audit_logs (id, user_id, action, resource, resource_id, previous_hash, record_hash)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '66666666-6666-6666-6666-666666666666',
    'SYSTEM_GENESIS_INITIALIZE',
    'SYSTEM',
    'GENESIS',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
) ON CONFLICT DO NOTHING;
