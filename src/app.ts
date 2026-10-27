import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prometheusRegistry, httpRequestDurationMicroseconds } from './config/metrics.js';
import { checkDatabaseHealth } from './config/database.js';
import { checkRedisHealth } from './config/redis.js';
import { errorHandler } from './middlewares/error.middleware.js';

// Domain Routers
import { authRoutes } from './modules/auth/auth.routes.js';
import { doctorRoutes } from './modules/doctors/doctors.routes.js';
import { availabilityRoutes } from './modules/availability/availability.routes.js';
import { bookingRoutes } from './modules/bookings/bookings.routes.js';
import { paymentRoutes } from './modules/payments/payments.routes.js';
import { consultationRoutes } from './modules/consultations/consultations.routes.js';
import { prescriptionRoutes } from './modules/prescriptions/prescriptions.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { payoutRoutes } from './modules/payouts/payouts.routes.js';
import { patientRoutes } from './modules/patients/patients.routes.js';

export const app = express();

// Security Headers & Cross-Origin Resource Sharing
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible telemedicine client embedding
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Correlation-ID', 'X-Amrutam-Signature'],
}));

app.use(express.json({ limit: '5mb' }));

// Request Telemetry Middleware
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
  });
  next();
});

// Prometheus Metrics Endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', prometheusRegistry.contentType);
    res.send(await prometheusRegistry.metrics());
  } catch (err) {
    res.status(500).send('Error collecting metrics');
  }
});

// Kubernetes / Docker Health Probes
app.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'amrutam-telemedicine-backend', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  const isDbReady = await checkDatabaseHealth();
  const isRedisReady = await checkRedisHealth();

  res.status(200).json({
    status: 'READY',
    checks: {
      database: isDbReady ? 'CONNECTED' : 'STANDALONE_FALLBACK',
      redis: isRedisReady ? 'CONNECTED' : 'IN_MEMORY_FALLBACK',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/startup', (req: Request, res: Response) => {
  res.status(200).json({ status: 'STARTED', uptimeSeconds: process.uptime() });
});

// Mount Domain API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/patients', patientRoutes);

// Root informational endpoint
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'Amrutam Telemedicine Engine',
    version: '1.0.0',
    description: 'Ayurvedic Telehealth Platform with Zero Double-Booking, AES-256-GCM Encryption & HMAC Signatures',
    docs: '/api/docs',
    health: '/health/ready',
    metrics: '/metrics',
  });
});

// RFC 7807 Error Handler
app.use(errorHandler);
