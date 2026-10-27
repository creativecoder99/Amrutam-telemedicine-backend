import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://amrutam_user:amrutam_secret@localhost:5432/amrutam_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('amrutam_telemedicine_super_secure_jwt_secret_key_2026'),
  JWT_REFRESH_SECRET: z.string().default('amrutam_telemedicine_super_secure_jwt_refresh_secret_key_2026'),
  ENCRYPTION_MASTER_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  AUDIT_HMAC_SECRET: z.string().default('amrutam_audit_hmac_secret_chain_key_2026'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_amrutam_telehealth'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_secret_key_mock_2026'),
});

export const env = envSchema.parse(process.env);
