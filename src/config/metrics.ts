import client from 'prom-client';

// Collect default Node.js and runtime metrics
client.collectDefaultMetrics({ prefix: 'amrutam_' });

// HTTP Request Duration Histogram
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'amrutam_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

// Slot Booking Counters
export const slotHoldAttemptsCounter = new client.Counter({
  name: 'amrutam_slot_hold_attempts_total',
  help: 'Total number of slot hold reservation attempts',
  labelNames: ['status'],
});

export const doubleBookingConflictsPrevented = new client.Counter({
  name: 'amrutam_double_booking_conflicts_prevented_total',
  help: 'Total concurrent slot collision attempts safely prevented by Redlock/DB lock',
});

// Active Holds Gauge
export const activeSlotHoldsGauge = new client.Gauge({
  name: 'amrutam_active_slot_holds_current',
  help: 'Current active 10-minute temporary slot reservations',
});

export const prometheusRegistry = client.register;
